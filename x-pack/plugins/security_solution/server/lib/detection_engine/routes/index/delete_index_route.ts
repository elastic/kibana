/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';
import { getPolicyExists } from '../../index/get_policy_exists';
import { deletePolicy } from '../../index/delete_policy';
import { getTemplateExists } from '../../index/get_template_exists';
import { deleteAllIndex } from '../../index/delete_all_index';
import { deleteTemplate } from '../../index/delete_template';

/**
 * Deletes all of the indexes, template, ilm policies, and aliases. You can check
 * this by looking at each of these settings from ES after a deletion:
 * GET /_template/.siem-signals-default
 * GET /.siem-signals-default-000001/
 * GET /_ilm/policy/.signals-default
 * GET /_alias/.siem-signals-default
 *
 * And ensuring they're all gone
 */
export const deleteIndexRoute = (router: IRouter) => {
  router.delete(
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
        const clusterClient = context.core.elasticsearch.legacy.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const callCluster = clusterClient.callAsCurrentUser;
        const index = siemClient.getSignalsIndex();
        const indexExists = await getIndexExists(callCluster, index);

        if (!indexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index: "${index}" does not exist`,
          });
        } else {
          await deleteAllIndex(callCluster, `${index}-*`);
          const policyExists = await getPolicyExists(callCluster, index);
          if (policyExists) {
            await deletePolicy(callCluster, index);
          }
          const templateExists = await getTemplateExists(callCluster, index);
          if (templateExists) {
            await deleteTemplate(callCluster, index);
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
