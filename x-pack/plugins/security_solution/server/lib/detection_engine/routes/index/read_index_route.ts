/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError, getBootstrapIndexExists } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../utils';
import { RuleDataPluginService } from '../../../../../../rule_registry/server';
import { fieldAliasesOutdated } from './check_template_version';
import { getIndexVersion } from './get_index_version';
import { isOutdated } from '../../migrations/helpers';
import { SIGNALS_TEMPLATE_VERSION } from './get_signals_template';

export const readIndexRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataService: RuleDataPluginService
) => {
  router.get(
    {
      path: DETECTION_ENGINE_INDEX_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const core = await context.core;
        const securitySolution = await context.securitySolution;

        const siemClient = securitySolution?.getAppClient();
        const esClient = core.elasticsearch.client.asCurrentUser;

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const spaceId = securitySolution.getSpaceId();
        const indexName = ruleDataService.getResourceName(`security.alerts-${spaceId}`);

        const index = siemClient.getSignalsIndex();
        const indexExists = await getBootstrapIndexExists(
          core.elasticsearch.client.asInternalUser,
          index
        );

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
              name: indexName,
              index_mapping_outdated: mappingOutdated || aliasesOutdated,
            },
          });
        } else {
          return response.ok({
            body: {
              name: indexName,
              index_mapping_outdated: false,
            },
          });
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
