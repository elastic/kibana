/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { produce } from 'immer';
import { schema as rt, TypeOf } from '@kbn/config-schema';
import { filter, reduce, mapKeys, each, set, unset, uniq, map, has } from 'lodash';

import type {
  ElasticsearchClient,
  IRouter,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from 'src/core/server';

import { transformError } from '@kbn/securitysolution-es-utils';
import yaml from 'js-yaml';

import { CspConfigSchema } from 'x-pack/plugins/cloud_security_posture/common/schemas/csp_configuration';
import { CspAppContext } from '../../plugin';
import { SAVE_DATA_YAML_ROUTE_PATH } from '../../../common/constants';
import { CspRuleSchema, cspRuleAssetSavedObjectType } from '../../../common/schemas/csp_rule';
import {
  PackagePolicyServiceInterface,
  AgentPolicyServiceInterface,
  AgentService,
} from '../../../../fleet/server';
import {
  GetAgentPoliciesResponseItem,
  PackagePolicy,
  AgentPolicy,
  PackagePolicyConfigRecord,
} from '../../../../fleet/common';
import { BENCHMARKS_ROUTE_PATH, CIS_KUBERNETES_PACKAGE_NAME } from '../../../common/constants';

export const DEFAULT_FINDINGS_PER_PAGE = 20;

// type FindingsQuerySchema = TypeOf<typeof schema>;

const getCspRule = async (soClient: SavedObjectsClientContract) => {
  const cspRules = await soClient.find<CspRuleSchema>({
    type: cspRuleAssetSavedObjectType,
    search: '',
    searchFields: ['name'],
    page: 1,
    sortField: 'name.raw',
    perPage: 10,
  });
  return cspRules;
};

const createConfig = async (
  cspRules: SavedObjectsFindResponse<CspRuleSchema>
): Promise<CspConfigSchema> => {
  const config = {
    activated_rules: {
      cis_k8s: cspRules.saved_objects.map((cspRule) => cspRule.id),
    },
  };
  return config;
};

const convertConfigToYaml = (config: CspConfigSchema): string => {
  const dataYaml = yaml.safeDump(config);
  console.log(dataYaml);
  return dataYaml;
};

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export const getPackageNameQuery = (packageName: string): string => {
  return `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${packageName}`;
};

// const updatePackagePolicy(esClient: ElasticsearchClient, soClient:SavedObjectsClientContract, packagePolicy: PackagePolicy, dataYaml:string){
//   const configFile: PackagePolicyConfigRecord = {
//     dataYaml: { type: 'config', value: dataYaml },
//   };
//   packagePolicy.vars = configFile;
//   console.log(packagePolicy.vars);
//   const newState = produce(packagePolicy, (draft) => {
//     unset(draft, 'id');
//     draft.vars = configFile;
//   });

//   await packagePolicyService?.update(soClient , esClient, packagePolicy.id, newState);
// }

const setVarToPackagePolicy = (packagePolicy: PackagePolicy, dataYaml: string): PackagePolicy => {
  const configFile: PackagePolicyConfigRecord = {
    dataYaml: { type: 'config', value: dataYaml },
  };
  const updatedPackagePolicy = produce(packagePolicy, (draft) => {
    unset(draft, 'id');
    draft.vars = configFile;
    // TODO: replace when Ori add this input
    // draft.inputs[0].streams[0].vars = configFile;
  });
  return updatedPackagePolicy;
};

export const getPackagePolicies = async (
  soClient: SavedObjectsClientContract,
  packagePolicyService: PackagePolicyServiceInterface | undefined,
  packageName: string
): Promise<PackagePolicy[]> => {
  if (!packagePolicyService) {
    throw new Error('packagePolicyService is undefined');
  }

  const packageNameQuery = getPackageNameQuery(packageName);

  const { items: packagePolicies } = (await packagePolicyService?.list(soClient, {
    kuery: packageNameQuery,
    page: 1,
    perPage: 20,
  })) ?? { items: [] as PackagePolicy[] };

  return packagePolicies;
};

export const defineSaveDataYamlRoute = (router: IRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: SAVE_DATA_YAML_ROUTE_PATH,
      //   validate: { query: schema },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const soClient = context.core.savedObjects.client;

        const cspRules = await getCspRule(soClient);
        const config = await createConfig(cspRules);

        const tmp = await soClient.create('csp_config', { config });
        console.log({ tmp });

        const dataYaml = convertConfigToYaml(config);

        const packagePolicyService = cspContext.service.packagePolicyService;
        const packagePolicies = await getPackagePolicies(
          soClient,
          packagePolicyService,
          CIS_KUBERNETES_PACKAGE_NAME
        );
        packagePolicies.map(async (packagePolicy) => {
          const updatedPackagePolicy = setVarToPackagePolicy(packagePolicy, dataYaml);
          await packagePolicyService?.update(
            soClient,
            esClient,
            packagePolicy.id,
            updatedPackagePolicy
          );
        });

        console.log(packagePolicies);
        console.log(packagePolicies[0].inputs[0]);
        console.log(packagePolicies[0].inputs[0].streams);
        console.log(packagePolicies[0].inputs[0].streams[0]);
        console.log(packagePolicies[0].inputs[0].streams[0].vars);
        // const cats: PackagePolicyConfigRecord = {
        //   dataYaml: { type: 'config', value: dataYaml },
        // };
        // packagePolicies[0].vars = cats;
        // console.log(packagePolicies[0].vars);
        // const newState = produce(packagePolicies[0], (draft) => {
        //   unset(draft, 'id');
        //   draft.vars = cats;
        // });
        // const updatePackagePolicy = { ...packagePolicies[0], vars: cats };

        // await packagePolicyService?.update(soClient, esClient, packagePolicies[0].id, newState);

        return response.ok({ body: cspRules });
      } catch (err) {
        const error = transformError(err);
        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );

// const schema = rt.object({
//   latest_cycle: rt.maybe(rt.boolean()),
//   page: rt.number({ defaultValue: 1, min: 0 }), // TODO: research for pagination best practice
//   per_page: rt.number({ defaultValue: DEFAULT_FINDINGS_PER_PAGE, min: 0 }),
// });
