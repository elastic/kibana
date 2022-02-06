/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema as rt, TypeOf } from '@kbn/config-schema';
import type {
  IRouter,
  Logger,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from 'src/core/server';
import {
  CspRuleSchema,
  cspRuleAssetSavedObjectType,
  CspDataYamlSchema,
} from '../../../common/schemas/csp_rule';
import { transformError } from '@kbn/securitysolution-es-utils';
import yaml from 'js-yaml';

import { SAVE_DATA_YAML_ROUTE_PATH } from '../../../common/constants';
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

const createDataYaml = async (
  cspRules: SavedObjectsFindResponse<CspRuleSchema>
): Promise<string> => {
  // activated_rules:
  // cis_k8s:
  //   - cis_1_1_1
  //   - cis_1_1_2
  // cis_eks:
  //   - cis_1_1_1
  //   const foo = { activated_rules: { cis_k8s: [cis_1_1_1, cis_1_1_2] }, cis_eks: [cis_1_1_3] } };
  let data = {
    activated_rules: {
      cis_k8s: cspRules.saved_objects.map((cspRule) => cspRule.id),
    },
  };

  // Write to file
  const dataYaml = yaml.safeDump(data);
  console.log(dataYaml);
  return dataYaml;
  //   return dataYaml;
};

export const defineSaveDataYamlRoute = (router: IRouter, logger: Logger): void =>
  router.get(
    {
      path: SAVE_DATA_YAML_ROUTE_PATH,
      //   validate: { query: schema },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const soClient = context.core.savedObjects.client;
        const cspRules = await getCspRule(soClient);
        const dataYaml = await createDataYaml(cspRules);
        const tmp = await soClient.create('data_yaml', { dataYaml });
        console.log({ tmp });

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
