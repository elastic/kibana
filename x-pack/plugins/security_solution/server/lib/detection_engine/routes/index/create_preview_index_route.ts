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
  setPolicy,
  createBootstrapIndex,
} from '@kbn/securitysolution-es-utils';
import type {
  AppClient,
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { DETECTION_ENGINE_RULES_PREVIEW_INDEX_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { getSignalsTemplate, SIGNALS_TEMPLATE_VERSION } from './get_signals_template';
import previewPolicy from './preview_policy.json';
import { getIndexVersion } from './get_index_version';
import { isOutdated } from '../../migrations/helpers';
import { templateNeedsUpdate } from './check_template_version';

export const createPreviewIndexRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_PREVIEW_INDEX_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const siemClient = context.securitySolution?.getAppClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        await createPreviewIndex(context, siemClient);

        return response.ok({ body: { acknowledged: true } });
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

export const createPreviewIndex = async (
  context: SecuritySolutionRequestHandlerContext,
  siemClient: AppClient
) => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const index = siemClient.getPreviewIndex();
  const spaceId = context.securitySolution.getSpaceId();

  const indexExists = await getIndexExists(esClient, index);

  const policyExists = await getPolicyExists(esClient, index);
  if (!policyExists) {
    await setPolicy(esClient, index, previewPolicy);
  }

  const ruleDataService = context.securitySolution.getRuleDataService();
  const aadIndexAliasName = ruleDataService.getResourceName(`security.alerts-${spaceId}`);

  if (await templateNeedsUpdate({ alias: index, esClient })) {
    await esClient.indices.putIndexTemplate({
      name: index,
      body: getSignalsTemplate(index, aadIndexAliasName) as Record<string, unknown>,
    });
  }

  if (indexExists) {
    const indexVersion = await getIndexVersion(esClient, index);
    if (isOutdated({ current: indexVersion, target: SIGNALS_TEMPLATE_VERSION })) {
      await esClient.indices.rollover({ alias: index });
    }
  } else {
    await createBootstrapIndex(esClient, index);
  }
};
