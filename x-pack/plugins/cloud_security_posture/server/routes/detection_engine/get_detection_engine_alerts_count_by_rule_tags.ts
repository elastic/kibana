/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_DETECTION_RULE_ALERTS_STATUS_PATH } from '../../../common/constants';
import { CspRouter } from '../../types';

export interface VulnerabilitiesStatisticsQueryResult {
  open: {
    doc_count: number;
  };
  acknowledged: {
    doc_count: number;
  };
  closed: {
    doc_count: number;
  };
}

const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts-default' as const;

export const getDetectionEngineAlertsCountByRuleTags = async (
  esClient: ElasticsearchClient,
  tags: string[]
) => {
  return await esClient.search<unknown, any>({
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.rule.tags': 'Cloud Security' } },
          ...tags.map((tag) => ({ term: { 'kibana.alert.rule.tags': tag } })),
        ],
      },
    },
    sort: '@timestamp:desc',
    index: DEFAULT_ALERTS_INDEX,
    aggs: {
      open: {
        filter: { term: { 'kibana.alert.workflow_status': 'open' } },
      },
      acknowledged: {
        filter: { term: { 'kibana.alert.workflow_status': 'acknowledged' } },
      },
      closed: {
        filter: { term: { 'kibana.alert.workflow_status': 'closed' } },
      },
    },
  });
};

const getDetectionEngineAlertsStatus = async (esClient: ElasticsearchClient, tags: string[]) => {
  const alertsCountByTags = await getDetectionEngineAlertsCountByRuleTags(esClient, tags);

  return {
    total: alertsCountByTags.hits.total?.value,
    open: alertsCountByTags.aggregations.open.doc_count,
    acknowledged: alertsCountByTags.aggregations.acknowledged.doc_count,
    closed: alertsCountByTags.aggregations.closed.doc_count,
  };
};
export const defineGetDetectionEngineAlertsStatus = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: GET_DETECTION_RULE_ALERTS_STATUS_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({
              tags: schema.arrayOf(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }

        const requestBody: any = request.query;
        const cspContext = await context.csp;

        try {
          const alerts: any = await getDetectionEngineAlertsStatus(
            cspContext.esClient.asCurrentUser,
            requestBody.tags
          );
          return response.ok({ body: alerts });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Failed to fetch csp rules templates ${err}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
