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
import { CspAppContext } from '../../plugin';
import { CspRulesConfigSchema } from '../../../common/schemas/csp_configuration';
import { CspRuleSchema, cspRuleAssetSavedObjectType } from '../../../common/schemas/csp_rule';
import { UPDATE_RULES_CONFIG_ROUTE_PATH } from '../../../common/constants';
import { CLOUD_SECURITY_PACKAGE_NAME } from '../../../common/constants';
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
  if (packagePolicies[0].package?.name !== CLOUD_SECURITY_PACKAGE_NAME) {
    throw new Error(`Package Policy Id '${packagePolicyId}' is not of type cloud security posture package`);
  }

  return packagePolicies![0];
};

export const getCspRules = async (soClient: SavedObjectsClientContract) => {
  const cspRules = await soClient.find<CspRuleSchema>({
    type: cspRuleAssetSavedObjectType,
    search: '',
    searchFields: ['name'],
    // TODO: research how to get all rules
    perPage: 10000,
  });
  return cspRules;
};

export const createRulesConfig = (
  cspRules: SavedObjectsFindResponse<CspRuleSchema>
): CspRulesConfigSchema => {
  const activatedRules = cspRules.saved_objects.filter((cspRule) => cspRule.attributes.enabled);

  const config = {
    activated_rules: {
      cis_k8s: activatedRules.map((activatedRule) => activatedRule.id),
    },
  };
  return config;
};

export const convertRulesConfigToYaml = (config: CspRulesConfigSchema): string => {
  return yaml.safeDump(config);
};

export const setVarToPackagePolicy = (
  packagePolicy: PackagePolicy,
  dataYaml: string
): PackagePolicy => {
  const configFile: PackagePolicyConfigRecord = {
    dataYaml: { type: 'config', value: dataYaml },
  };
  const updatedPackagePolicy = produce(packagePolicy, (draft) => {
    unset(draft, 'id');
    draft.vars = configFile;
    // TODO: disable comments after adding base config to integration
    // draft.inputs[0].vars = configFile;
  });
  return updatedPackagePolicy;
};

export const updatePackagePolicy = (
  packagePolicyService: PackagePolicyServiceInterface,
  packagePolicy: PackagePolicy,
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  dataYaml: string
): Promise<PackagePolicy> => {
  const updatedPackagePolicy = setVarToPackagePolicy(packagePolicy, dataYaml);
  return packagePolicyService.update(soClient, esClient, packagePolicy.id, updatedPackagePolicy);
};

export const defineUpdateRulesConfigRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.post(
    {
      path: UPDATE_RULES_CONFIG_ROUTE_PATH,
      validate: { query: configurationUpdateInputSchema },
    },
    async (context, request, response) => {
      if (!context.fleet.authz.fleet.all) {
        return response.forbidden();
      }

      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const soClient = context.core.savedObjects.client;
        const packagePolicyService = cspContext.service.packagePolicyService;
        const packagePolicyId = request.query.package_policy_id;

        if (!packagePolicyService) {
          throw new Error(`Failed to get Fleet services`);
        }
        const packagePolicy = await getPackagePolicy(
          soClient,
          packagePolicyService,
          packagePolicyId
        );

        const cspRules = await getCspRules(soClient);
        const rulesConfig = createRulesConfig(cspRules);
        const dataYaml = convertRulesConfigToYaml(rulesConfig);

        const updatedPackagePolicies = await updatePackagePolicy(
          packagePolicyService!,
          packagePolicy,
          esClient,
          soClient,
          dataYaml
        );

        return response.ok({ body: updatedPackagePolicies });
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

export const configurationUpdateInputSchema = rt.object({
  /**
   * CSP integration instance ID
   */
  package_policy_id: rt.string(),
});
