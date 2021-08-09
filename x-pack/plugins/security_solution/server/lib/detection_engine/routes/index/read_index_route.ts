/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError, getIndexExists } from '@kbn/securitysolution-es-utils';
import { parseExperimentalConfigValue } from '../../../../../common/experimental_features';
import { ConfigType } from '../../../../config';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DEFAULT_ALERTS_INDEX, DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../utils';
import { SIGNALS_TEMPLATE_VERSION } from './get_signals_template';
import { getIndexVersion } from './get_index_version';
import { isOutdated } from '../../migrations/helpers';
import { fieldAliasesOutdated } from './check_template_version';

export const readIndexRoute = (router: SecuritySolutionPluginRouter, config: ConfigType) => {
  router.get(
    {
      path: DETECTION_ENGINE_INDEX_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        // TODO: Once we are past experimental phase this code should be removed
        const { ruleRegistryEnabled } = parseExperimentalConfigValue(config.enableExperimental);

        const index = siemClient.getSignalsIndex();
        const indexExists = await getIndexExists(esClient, index);

        if (indexExists) {
          let mappingOutdated: boolean | null = null;
          let aliasesOutdated: boolean | null = null;
          try {
            const indexVersion = await getIndexVersion(esClient, index);
            mappingOutdated = isOutdated({
              current: indexVersion,
              target: SIGNALS_TEMPLATE_VERSION,
            });
            aliasesOutdated = await fieldAliasesOutdated(esClient, index);
          } catch (err) {
            const error = transformError(err);
            // Some users may not have the view_index_metadata permission necessary to check the index mapping version
            // so just continue and return null for index_mapping_outdated if the error is a 403
            if (error.statusCode !== 403) {
              return siemResponse.error({
                body: error.message,
                statusCode: error.statusCode,
              });
            }
          }
          return response.ok({
            body: {
              name: ruleRegistryEnabled ? DEFAULT_ALERTS_INDEX : index,
              index_mapping_outdated: mappingOutdated || aliasesOutdated,
            },
          });
        } else {
          if (ruleRegistryEnabled) {
            return response.ok({
              body: {
                name: DEFAULT_ALERTS_INDEX,
                index_mapping_outdated: false,
              },
            });
          } else {
            return siemResponse.error({
              statusCode: 404,
              body: 'index for this space does not exist',
            });
          }
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
