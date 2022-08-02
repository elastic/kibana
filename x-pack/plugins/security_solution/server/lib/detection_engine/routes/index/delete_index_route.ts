/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformError,
  getIndexExists,
  getPolicyExists,
  deletePolicy,
  deleteAllIndex,
} from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

/**
 * Deletes all of the indexes, template, ilm policies, and aliases. You can check
 * this by looking at each of these settings from ES after a deletion:
 * GET /_template/.siem-signals-default
 * GET /_index_template/.siem-signals-default
 * GET /.siem-signals-default-000001/
 * GET /_ilm/policy/.signals-default
 * GET /_alias/.siem-signals-default
 *
 * And ensuring they're all gone
 */
export const deleteIndexRoute = (router: SecuritySolutionPluginRouter) => {
  router.delete(
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
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        const siemClient = (await context.securitySolution)?.getAppClient();

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const index = siemClient.getSignalsIndex();
        const indexExists = await getIndexExists(esClient, index);

        if (!indexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index: "${index}" does not exist`,
          });
        } else {
          await deleteAllIndex(esClient, index);
          const policyExists = await getPolicyExists(esClient, index);
          if (policyExists) {
            await deletePolicy(esClient, index);
          }
          const templateExists = await esClient.indices.existsIndexTemplate({ name: index });
          if (templateExists) {
            await esClient.indices.deleteIndexTemplate({ name: index });
          }
          const legacyTemplateExists = await esClient.indices.existsTemplate({ name: index });
          if (legacyTemplateExists) {
            await esClient.indices.deleteTemplate({ name: index });
          }
          return response.ok({ body: { acknowledged: true } });
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
