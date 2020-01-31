/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, KibanaRequest, RequestHandler } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';

import { getRequestData, buildAlertListESQuery } from '../services/endpoint/alert_query_builders';
import { AlertData, AlertResultList } from '../../common/types';
import { AlertRequestParams, AlertRequestData, EndpointAppContext } from '../types';

const ALERTS_ROUTE = '/api/endpoint/alerts';

export const reqSchema = schema.object({
  page_size: schema.number({ defaultValue: 10, min: 1, max: 10000 }),
  page_index: schema.number({ defaultValue: 0, min: 0 }),
  filters: schema.string({ defaultValue: '' }),
});

export function registerAlertRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const alertsHandler: RequestHandler<unknown, AlertRequestParams> = async (ctx, req, res) => {
    try {
      const reqData = await getRequestData(
        req as KibanaRequest<unknown, AlertRequestParams, AlertRequestParams, any>,
        endpointAppContext
      );

      const reqBody = await buildAlertListESQuery(reqData);
      endpointAppContext.logFactory.get('alerts').debug('ES query: ' + JSON.stringify(reqBody));

      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        reqBody
      )) as SearchResponse<AlertData>;
      return res.ok({ body: mapToAlertResultList(endpointAppContext, reqData, response) });
    } catch (err) {
      return res.internalError({ body: err });
    }
  };

  router.get(
    {
      path: ALERTS_ROUTE,
      validate: {
        query: reqSchema,
      },
      options: { authRequired: true },
    },
    alertsHandler
  );

  router.post(
    {
      path: ALERTS_ROUTE,
      validate: {
        body: reqSchema,
      },
      options: { authRequired: true },
    },
    alertsHandler
  );
}

function mapToAlertResultList(
  endpointAppContext: EndpointAppContext,
  reqData: AlertRequestData,
  searchResponse: SearchResponse<AlertData>
): AlertResultList {
  interface Total {
    value: number;
    relation: string;
  }

  let totalNumberOfAlerts: number = 0;
  let totalIsLowerBound: boolean = false;

  // We handle 2 separate schemas for the response below, due to: https://github.com/elastic/kibana/issues/56694
  if (typeof searchResponse?.hits?.total === 'object') {
    const total: Total = searchResponse?.hits?.total as Total;
    totalNumberOfAlerts = total?.value || 0;
    totalIsLowerBound = total?.relation === 'gte' || false;
  } else {
    totalNumberOfAlerts = searchResponse?.hits?.total || 0;
  }

  if (totalIsLowerBound) {
    // This shouldn't happen, as we always try to fetch enough hits to satisfy the current request and the next page.
    endpointAppContext.logFactory
      .get('alerts')
      .warn('Total hits not counted accurately. Pagination numbers may be inaccurate.');
  }

  return {
    request_page_size: reqData.pageSize,
    request_page_index: reqData.pageIndex,
    result_from_index: reqData.fromIndex,
    alerts: searchResponse?.hits?.hits?.map(entry => entry._source),
    total: totalNumberOfAlerts,
  };
}
