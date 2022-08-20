/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema as rt, TypeOf } from '@kbn/config-schema';
import yaml from 'js-yaml';
import { PackagePolicy, PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import produce from 'immer';
import { unset } from 'lodash';
import type { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { createCspRuleSearchFilterByPackagePolicy } from '../../../common/utils/helpers';
import type { CspRule, CspRulesConfiguration } from '../../../common/schemas';
import {
  CSP_RULE_SAVED_OBJECT_TYPE,
  UPDATE_RULES_CONFIG_ROUTE_PATH,
} from '../../../common/constants';
import { CspApiRequestHandlerContext, CspRouter, CspRequestHandler } from '../../types';

export type UpdateRulesConfigBodySchema = TypeOf<typeof updateRulesConfigurationBodySchema>;

type SavedObjectRuleUpdatePayload = Pick<CspRule, 'enabled'>;

/**
 * Used for updating rules saved object with 'next'. 'current' is used for potential rollback.
 */
type RulesSavedObjectUpdate = Record<
  'current' | 'next',
  Array<SavedObject<SavedObjectRuleUpdatePayload>>
>;

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
   * Rules to update
   */
  rules: rt.arrayOf(
    rt.object({
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
export const setVarToPackagePolicy = (
  packagePolicy: PackagePolicy,
  runtimeCfg: string
): PackagePolicy => {
  const configFile: PackagePolicyConfigRecord = {
    runtimeCfg: { type: 'yaml', value: runtimeCfg },
  };
  const updatedPackagePolicy = produce(packagePolicy, (draft) => {
    unset(draft, 'id');
    if (draft.vars) {
      draft.vars.runtimeCfg = configFile.runtimeCfg;
    } else {
      draft.vars = configFile;
    }
  });
  return updatedPackagePolicy;
};

/**
 * gets all rules of a package policy with fields required for runtime config
 */
const getAllPartialRulesSavedObjects = (
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
 * Combines all existing rules with overrides
 * @returns all rules of a package policy with their runtime config fields
 */
const getAllPackagePolicyRules = async (
  soClient: SavedObjectsClientContract,
  packagePolicy: PackagePolicy,
  rulesToChange: UpdateRulesConfigBodySchema['rules']
): Promise<Array<SavedObject<PackagePolicyRuleUpdatePayload>>> => {
  const currentRules = await getAllPartialRulesSavedObjects(
    soClient,
    packagePolicy.id,
    packagePolicy.policy_id
  );
  const nextRulesMap = Object.fromEntries(rulesToChange.map((rule) => [rule.id, rule.enabled]));
  return currentRules.map((rule) => ({
    ...rule,
    enabled: nextRulesMap[rule.id] ?? rule.attributes.enabled,
  }));
};

/**
 * Updates the package policy vars object with a new value for the runtimeCfg key
 * @internal
 * */
export const updatePackagePolicy = async ({
  rules = [],
  packagePolicyService,
  packagePolicy,
  esClient,
  soClient,
  user,
}: {
  rules?: UpdateRulesConfigBodySchema['rules'];
  packagePolicyService: PackagePolicyServiceInterface;
  packagePolicy: PackagePolicy;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  user: AuthenticatedUser | null;
}): Promise<PackagePolicy> => {
  const packagePolicyRules = await getAllPackagePolicyRules(soClient, packagePolicy, rules);

  const updatedPolicy = setVarToPackagePolicy(
    packagePolicy,
    yaml.safeDump(createRulesConfig(packagePolicyRules))
  );

  return packagePolicyService.update(
    soClient,
    esClient,
    packagePolicy.id,
    updatedPolicy,
    user ? { user } : undefined
  );
};

/**
 * Keeps only fields we want/need to use for updating a rule saved-object
 */
const getRuleUpdateFields = ({
  id,
  type,
  attributes,
  references,
}: SavedObject<SavedObjectRuleUpdatePayload>) => ({
  id,
  type,
  attributes,
  references,
});

/**
 * Gets the next and current rules to update/rollback respectively
 * @internal
 */
export const getPartialSavedObjectRulesById = async (
  soClient: CspApiRequestHandlerContext['soClient'],
  rulesToChange: UpdateRulesConfigBodySchema['rules']
): Promise<RulesSavedObjectUpdate> => {
  const current = (
    await soClient.bulkGet<SavedObjectRuleUpdatePayload>(
      rulesToChange.map((rule) => ({
        id: rule.id,
        type: CSP_RULE_SAVED_OBJECT_TYPE,
        fields: ['enabled'],
      }))
    )
  ).saved_objects.map(getRuleUpdateFields);

  const currentRulesMap = Object.fromEntries(current.map((rule) => [rule.id, rule]));
  const next = rulesToChange.map((rule) => ({
    ...currentRulesMap[rule.id],
    attributes: {
      ...currentRulesMap[rule.id].attributes,
      enabled: rule.enabled,
    },
  }));

  return {
    current,
    next,
  };
};

/**
 * Combines updating rules in saved-objects and package policy vars into a single operation
 * @internal
 */
export const updateRulesById = async (
  { soClient, packagePolicyService, esClient, user, logger }: CspApiRequestHandlerContext,
  { rules, package_policy_id: packagePolicyId }: UpdateRulesConfigBodySchema
): Promise<PackagePolicy> => {
  logger.debug('Start updating rules');

  const { current, next } = await getPartialSavedObjectRulesById(soClient, rules);

  try {
    await soClient.bulkUpdate(next); // Only needs a Partial<SavedObject<T>> for updating
  } catch (e) {
    logger.debug('Failed updating saved-object rules');
    throw e;
  }

  try {
    const packagePolicy = await packagePolicyService.get(soClient, packagePolicyId);
    if (!packagePolicy) throw new Error('Missing package policy');

    const updatedPolicy = await updatePackagePolicy({
      rules: next.map((rule) => ({ id: rule.id, enabled: rule.attributes.enabled })),
      soClient,
      packagePolicyService,
      user,
      packagePolicy,
      esClient: esClient.asCurrentUser,
    });

    logger.debug('Finish updating rules');

    return updatedPolicy;
  } catch (e) {
    logger.debug('Failed updating rules in package policy vars');
    logger.error(e);

    logger.debug('Try to rollback to previous saved-objects rules');
    await soClient.bulkUpdate(current);
    logger.debug('Finish rollback');

    throw e;
  }
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
    const updatedPackagePolicy = await updateRulesById(cspContext, request.body);
    return response.ok({ body: updatedPackagePolicy });
  } catch (e) {
    const error = transformError(e);
    cspContext.logger.error(
      `Failed to update rules configuration on package policy ${error.message}`
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
