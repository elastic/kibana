/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { ElasticsearchClient } from '@kbn/core/server';
import { INFO_ROUTE_PATH, LATEST_FINDINGS_INDEX_DEFAULT_NS } from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { CspRouter } from '../../types';
import { CspSetupStatus } from '../../../common/types';

const getLatestFindingsStatus = async (
  esClient: ElasticsearchClient
): Promise<CspSetupStatus['latestFindingsIndexStatus']> => {
  try {
    const queryResult = await esClient.search({
      index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
      query: {
        match_all: {},
      },
      size: 1,
    });
    const hasLatestFinding = !!queryResult.hits.hits.length;

    return hasLatestFinding ? 'applicable' : 'inapplicable';
  } catch (e) {
    return 'inapplicable';
  }
};

export const defineGetCspSetupStatusRoute = (router: CspRouter, cspContext: CspAppContext): void =>
  router.get(
    {
      path: INFO_ROUTE_PATH,
      validate: false,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    },
    async (context, _, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const latestFindingsIndexStatus = await getLatestFindingsStatus(esClient);

        const body: CspSetupStatus = {
          latestFindingsIndexStatus,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);
        cspContext.logger.error(`Error while fetching findings status: ${err}`);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
