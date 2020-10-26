/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppClient } from '../../../../types';
import { IRouter, RequestHandlerContext } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';
import { getPolicyExists } from '../../index/get_policy_exists';
import { setPolicy } from '../../index/set_policy';
import { setTemplate } from '../../index/set_template';
import { getSignalsTemplate, SIGNALS_TEMPLATE_VERSION } from './get_signals_template';
import { createBootstrapIndex } from '../../index/create_bootstrap_index';
import signalsPolicy from './signals_policy.json';
import { templateNeedsUpdate } from './check_template_version';
import { getIndexVersion } from './get_index_version';

export const createIndexRoute = (router: IRouter) => {
  router.post(
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
        const siemClient = context.securitySolution?.getAppClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        await createDetectionIndex(context, siemClient!);
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

class CreateIndexError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const createDetectionIndex = async (
  context: RequestHandlerContext,
  siemClient: AppClient
): Promise<void> => {
  const clusterClient = context.core.elasticsearch.legacy.client;
  const callCluster = clusterClient.callAsCurrentUser;

  if (!siemClient) {
    throw new CreateIndexError('', 404);
  }

  const index = siemClient.getSignalsIndex();
  const policyExists = await getPolicyExists(callCluster, index);
  if (!policyExists) {
    await setPolicy(callCluster, index, signalsPolicy);
  }
  if (await templateNeedsUpdate(callCluster, index)) {
    await setTemplate(callCluster, index, getSignalsTemplate(index));
  }
  const indexExists = await getIndexExists(callCluster, index);
  if (indexExists) {
    const indexVersion = await getIndexVersion(callCluster, index);
    if (indexVersion !== SIGNALS_TEMPLATE_VERSION) {
      await callCluster('indices.rollover', { alias: index });
    }
  } else {
    await createBootstrapIndex(callCluster, index);
  }
};
