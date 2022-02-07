/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema as rt, TypeOf } from '@kbn/config-schema';
import type {
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

export const defineSaveDataYamlRoute = (router: IRouter, cspContext: CspAppContext): void =>
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
        const config = await createConfig(cspRules);

        const tmp = await soClient.create('csp_config', { config });
        console.log({ tmp });

        convertConfigToYaml(config);

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
