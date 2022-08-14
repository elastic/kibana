/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ElasticsearchClient,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { schema as rt } from '@kbn/config-schema';
import { transformError } from '@kbn/securitysolution-es-utils';

import { produce } from 'immer';
import { unset } from 'lodash';
import yaml from 'js-yaml';

import { PackagePolicy, PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { createCspRuleSearchFilterByPackagePolicy } from '../../../common/utils/helpers';

import type { CspRule, CspRulesConfiguration } from '../../../common/schemas';
import {
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  UPDATE_RULES_CONFIG_ROUTE_PATH,
  CSP_RULE_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import { CspRouter } from '../../types';

export const getPackagePolicy = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface,
  packagePolicyId: string
): Promise<PackagePolicy> => {
  const packagePolicies = await packagePolicyService.getByIDs(soClient, [packagePolicyId]);

  // PackagePolicies always contains one element, even when package does not exist
  if (!packagePolicies || !packagePolicies[0].version) {
    throw new Error(`package policy Id '${packagePolicyId}' is not exist`);
  }
  if (packagePolicies[0].package?.name !== CLOUD_SECURITY_POSTURE_PACKAGE_NAME) {
    throw new Error(
      `Package Policy Id '${packagePolicyId}' is not of type cloud security posture package`
    );
  }

  return packagePolicies![0];
};

export const getCspRules = (
  soClient: SavedObjectsClientContract,
  packagePolicy: PackagePolicy
): Promise<SavedObjectsFindResponse<CspRule, unknown>> => {
  return soClient.find<CspRule>({
    type: CSP_RULE_SAVED_OBJECT_TYPE,
    filter: createCspRuleSearchFilterByPackagePolicy({
      packagePolicyId: packagePolicy.id,
      policyId: packagePolicy.policy_id,
    }),
    searchFields: ['name'],
    // TODO: research how to get all rules
    perPage: 10000,
  });
};

const getEnabledRulesByBenchmark = (rules: SavedObjectsFindResponse<CspRule>['saved_objects']) =>
  rules.reduce<CspRulesConfiguration['runtime_cfg']['activated_rules']>((benchmarks, rule) => {
    const benchmark = rule.attributes.metadata.benchmark.id;
    if (!rule.attributes.enabled || !benchmark) return benchmarks;
    if (!benchmarks[benchmark]) {
      benchmarks[benchmark] = [];
    }

    benchmarks[benchmark].push(rule.attributes.metadata.rego_rule_id);
    return benchmarks;
  }, {});

export const createRulesConfig = (
  cspRules: SavedObjectsFindResponse<CspRule>
): CspRulesConfiguration => ({
  runtime_cfg: {
    activated_rules: getEnabledRulesByBenchmark(cspRules.saved_objects),
  },
});

export const convertRulesConfigToYaml = (config: CspRulesConfiguration): string => {
  return yaml.safeDump(config);
};

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

export const updateAgentConfiguration = async (
  packagePolicyService: PackagePolicyServiceInterface,
  packagePolicy: PackagePolicy,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  user: AuthenticatedUser | null
): Promise<PackagePolicy> => {
  const cspRules = await getCspRules(soClient, packagePolicy);
  const rulesConfig = createRulesConfig(cspRules);
  const runtimeCfg = convertRulesConfigToYaml(rulesConfig);
  const updatedPackagePolicy = setVarToPackagePolicy(packagePolicy, runtimeCfg);
  const options = { user: user ? user : undefined };
  return packagePolicyService.update(
    soClient,
    esClient,
    packagePolicy.id,
    updatedPackagePolicy,
    options
  );
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
    async (context, request, response) => {
      const cspContext = await context.csp;

      if (!(await context.fleet).authz.fleet.all) {
        return response.forbidden();
      }

      try {
        const packagePolicy = await getPackagePolicy(
          cspContext.soClient,
          cspContext.packagePolicyService,
          request.body.package_policy_id
        );

        const updatedPackagePolicy = await updateAgentConfiguration(
          cspContext.packagePolicyService,
          packagePolicy,
          cspContext.esClient.asCurrentUser,
          cspContext.soClient,
          cspContext.user
        );

        return response.ok({ body: updatedPackagePolicy });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(
          `Failed to update rules configuration on package policy ${error.message}`
        );
        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );

export const updateRulesConfigurationBodySchema = rt.object({
  /**
   * CSP integration instance ID
   */
  package_policy_id: rt.string(),
});
