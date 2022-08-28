/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';
import yaml from 'js-yaml';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type {
  ElasticsearchClient,
  SavedObject,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { unset } from 'lodash';
import produce from 'immer';
import { createCspRuleSearchFilterByPackagePolicy } from '../../../common/utils/helpers';
import type { CspRule, CspRulesConfiguration } from '../../../common/schemas';
import {
  CSP_RULE_SAVED_OBJECT_TYPE,
  UPDATE_RULES_CONFIG_ROUTE_PATH,
} from '../../../common/constants';
import type { CspApiRequestHandlerContext, CspRouter, CspRequestHandler } from '../../types';

export type UpdateRulesConfigBodySchema = TypeOf<typeof updateRulesConfigurationBodySchema>;

/** Minimal set of fields required for updating a CSP SO rule */
type SavedObjectRuleUpdatePayload = Pick<CspRule, 'enabled'>;

/**
 * Minimal set of fields required for generating
 * the value of the runtime config key on the package policy vars object
 */
export interface PackagePolicyRuleUpdatePayload {
  enabled: boolean;
  metadata: { benchmark: { id: string }; rego_rule_id: string };
}

const RUNTIME_CFG_FIELDS = ['enabled', 'metadata.benchmark.id', 'metadata.rego_rule_id'];

const updateRulesConfigurationBodySchema = rt.object({
  /**
   * CSP integration instance ID
   */
  package_policy_id: rt.string(),
  /**
   * CSP rules to update
   */
  rules: rt.arrayOf(
    rt.object({
      /**
       * the rule saved object id
       */
      id: rt.string(),
      enabled: rt.boolean(),
    })
  ),
});

const getEnabledRulesByBenchmark = (rules: Array<SavedObject<PackagePolicyRuleUpdatePayload>>) =>
  rules.reduce<CspRulesConfiguration['runtime_cfg']['activated_rules']>((benchmarks, rule) => {
    const benchmark = rule.attributes.metadata.benchmark.id;
    if (!rule.attributes.enabled || !benchmark) return benchmarks;
    if (!benchmarks[benchmark]) {
      benchmarks[benchmark] = [];
    }

    benchmarks[benchmark].push(rule.attributes.metadata.rego_rule_id);
    return benchmarks;
  }, {});

/* @internal */
export const createRulesConfig = (
  cspRules: Array<SavedObject<PackagePolicyRuleUpdatePayload>>
): CspRulesConfiguration => ({
  runtime_cfg: {
    activated_rules: getEnabledRulesByBenchmark(cspRules),
  },
});

/* @internal */
export const getUpdatedPackagePolicy = (
  packagePolicy: PackagePolicy,
  runtimeCfg: string
): PackagePolicy =>
  produce(packagePolicy, (draft) => {
    unset(draft, 'id');

    if (!draft.vars) draft.vars = {};
    draft.vars.runtimeCfg = { type: 'yaml', value: runtimeCfg };
  });

/**
 * gets all rules of a package policy with fields required for runtime config
 */
export const getAllPackagePolicyCspRulesSO = (
  soClient: SavedObjectsClientContract,
  packagePolicyId: PackagePolicy['id'],
  policyId: PackagePolicy['policy_id']
) =>
  soClient
    .find<PackagePolicyRuleUpdatePayload>({
      type: CSP_RULE_SAVED_OBJECT_TYPE,
      filter: createCspRuleSearchFilterByPackagePolicy({
        packagePolicyId,
        policyId,
      }),
      fields: RUNTIME_CFG_FIELDS,
      searchFields: ['name'],
      perPage: 10000,
    })
    .then((response) => response.saved_objects);

/**
 * gets rules by id of a package policy with fields required for updating SO object
 */
const getByIdCurrentRulesSO = (
  soClient: CspApiRequestHandlerContext['soClient'],
  ruleIds: string[]
) =>
  soClient
    .bulkGet<SavedObjectRuleUpdatePayload>(
      ruleIds.map((ruleId) => ({
        id: ruleId,
        type: CSP_RULE_SAVED_OBJECT_TYPE,
        fields: ['enabled'],
      }))
    )
    .then((response) => response.saved_objects);

const getRuntimeCfgVarValue = (rules: Array<SavedObject<PackagePolicyRuleUpdatePayload>>) =>
  yaml.safeDump(createRulesConfig(rules));

/**
 * Updates the package policy vars object with a new value for the runtimeCfg key
 * @internal
 * */
export const updatePackagePolicyRuntimeCfgVar = async ({
  packagePolicyService,
  packagePolicy,
  esClient,
  soClient,
  user,
  rules,
}: {
  packagePolicyService: PackagePolicyServiceInterface;
  packagePolicy: PackagePolicy;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  user: AuthenticatedUser | null;
  rules: Array<SavedObject<PackagePolicyRuleUpdatePayload>>;
}): Promise<PackagePolicy> =>
  packagePolicyService.update(
    soClient,
    esClient,
    packagePolicy.id,
    getUpdatedPackagePolicy(packagePolicy, getRuntimeCfgVarValue(rules)),
    user ? { user } : undefined
  );

/**
 * Keeps only fields we want/need to use for updating a rule saved-object
 */
const getRuleUpdateFields = ({
  id,
  type,
  attributes,
  references,
}: SavedObject<SavedObjectRuleUpdatePayload>) => ({ id, type, attributes, references });

/**
 * Gets current rules with next values for 'enabled' property
 */
const getNextCspRulesSO = (
  current: Array<SavedObject<SavedObjectRuleUpdatePayload>>,
  rulesToChange: UpdateRulesConfigBodySchema['rules']
) => {
  const currentRulesMap = Object.fromEntries(
    current.map((rule) => [rule.id, getRuleUpdateFields(rule)])
  );
  return rulesToChange.map((rule) => ({
    ...currentRulesMap[rule.id],
    attributes: {
      ...currentRulesMap[rule.id].attributes,
      enabled: rule.enabled,
    },
  }));
};

const updateRulesSO = <T extends Partial<CspRule>>(
  soClient: SavedObjectsClientContract,
  rulesSO: Array<SavedObject<T>>
) => soClient.bulkUpdate(rulesSO);

const runUpdate = async ({
  rollbackSO,
  updateSO,
  updatePackagePolicy,
  logger,
}: {
  rollbackSO: () => Promise<unknown>;
  updateSO: () => Promise<unknown>;
  updatePackagePolicy: () => Promise<PackagePolicy>;
  logger: Logger;
}) => {
  logger.info(`Start updating rules`);

  await updateSO();

  try {
    const updatedPolicy = await updatePackagePolicy();
    logger.info('Finish updating rules');
    return updatedPolicy;
  } catch (e) {
    logger.error('Failed updating rules in package policy vars');
    logger.error(e);

    logger.info('Rollback to previous saved-objects rules');
    await rollbackSO();
    logger.info('Finish rollback');

    throw e;
  }
};
/**
 * Combines updating rules saved-objects and package policy vars into a single operation
 * @internal
 */
export const updatePackagePolicyCspRules = async (
  { soClient, packagePolicyService, esClient, user, logger }: CspApiRequestHandlerContext,
  packagePolicy: PackagePolicy,
  rulesToChange: UpdateRulesConfigBodySchema['rules']
): Promise<PackagePolicy> => {
  const currentRulesSO = await getByIdCurrentRulesSO(
    soClient,
    rulesToChange.map((rule) => rule.id)
  );

  const rollbackSO = () => updateRulesSO(soClient, currentRulesSO);
  const updateSO = () => updateRulesSO(soClient, getNextCspRulesSO(currentRulesSO, rulesToChange));
  const updatePackagePolicy = async () =>
    updatePackagePolicyRuntimeCfgVar({
      rules: await getAllPackagePolicyCspRulesSO(
        soClient,
        packagePolicy.id,
        packagePolicy.policy_id
      ),
      soClient,
      packagePolicyService,
      user,
      packagePolicy,
      esClient: esClient.asCurrentUser,
    });

  return runUpdate({
    logger,
    rollbackSO,
    updateSO,
    updatePackagePolicy,
  });
};

/** @internal */
export const updateRulesConfigurationHandler: CspRequestHandler<
  void,
  void,
  UpdateRulesConfigBodySchema
> = async (context, request, response) => {
  const cspContext = await context.csp;

  if (!(await context.fleet).authz.fleet.all) {
    return response.forbidden();
  }

  try {
    const packagePolicy = await cspContext.packagePolicyService.get(
      cspContext.soClient,
      request.body.package_policy_id
    );
    if (!packagePolicy)
      throw new Error(`Missing package policy - ${request.body.package_policy_id}`);

    const updatedPackagePolicy = await updatePackagePolicyCspRules(
      cspContext,
      packagePolicy,
      request.body.rules
    );
    return response.ok({ body: updatedPackagePolicy });
  } catch (e) {
    const error = transformError(e);
    cspContext.logger.error(
      `Failed to update rules configuration on package policy - ${error.message}`
    );

    return response.customError({
      body: { message: error.message },
      statusCode: error.statusCode,
    });
  }
};

export const defineUpdateRulesConfigRoute = (router: CspRouter): void =>
  router.post(
    {
      path: UPDATE_RULES_CONFIG_ROUTE_PATH,
      validate: { body: updateRulesConfigurationBodySchema },
      options: {
        tags: ['access:cloud-security-posture-all'],
      },
    },
    updateRulesConfigurationHandler
  );
