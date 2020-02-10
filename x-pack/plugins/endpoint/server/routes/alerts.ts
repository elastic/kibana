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

export const reqSchema = schema.object(
  {
    page_size: schema.maybe(schema.number()),
    page_index: schema.maybe(schema.number()),
    after: schema.maybe(
      schema.arrayOf(schema.any(), {
        minSize: 2,
        maxSize: 2,
      })
    ),
    before: schema.maybe(
      schema.arrayOf(schema.any(), {
        minSize: 2,
        maxSize: 2,
      })
    ),
    sort: schema.string({ defaultValue: '@timestamp' }),
    order: schema.string({
      defaultValue: 'desc',
      validate(value) {
        if (value !== 'asc' && value !== 'desc') {
          return 'must be `asc` or `desc`';
        }
      },
    }),
    filters: schema.string({ defaultValue: '' }),
    query: schema.string({ defaultValue: '' }),
  },
  {
    validate(value) {
      if (value.after !== undefined && value.page_index !== undefined) {
        return '[page_index] cannot be used with [after]';
      }
      if (value.before !== undefined && value.page_index !== undefined) {
        return '[page_index] cannot be used with [before]';
      }
      if (value.before !== undefined && value.after !== undefined) {
        return '[before] cannot be used with [after]';
      }
    },
  }
);

export function registerAlertRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const alertsHandler: RequestHandler<unknown, AlertRequestParams> = async (ctx, req, res) => {
    try {
      const reqData = await getRequestData(
        req as KibanaRequest<unknown, AlertRequestParams, AlertRequestParams, any>,
        endpointAppContext
      );

      const reqWrapper = await buildAlertListESQuery(reqData);
      endpointAppContext.logFactory.get('alerts').debug('ES query: ' + JSON.stringify(reqWrapper));

      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        reqWrapper
      )) as SearchResponse<AlertData>;

      return res.ok({ body: mapToAlertResultList(endpointAppContext, reqData, response) });
    } catch (err) {
      const e = err as Error;
      if (e.name === 'EndpointValidationError') {
        return res.badRequest({ body: err });
      }

      return res.internalError({ body: err });
    }
  };

  const alertDetailHandler: RequestHandler<unknown, unknown> = async (ctx, req, res) => {
    try {
      function mapHit(entry: AlertDataWrapper): AlertData {
        return {
          id: entry._id,
          ...entry._source,
        };
      }

      const alertId = req.params.id;
      const response = (await ctx.core.elasticsearch.dataClient.callAsCurrentUser('get', {
        index: 'my-index',
        id: alertId,
      })) as SearchResponse<AlertData>;

      return res.ok({ body: mapHit(response) });
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

  router.get(
    {
      path: ALERTS_ROUTE + '/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: { authRequired: true },
    },
    alertDetailHandler
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

  interface AlertDataWrapper {
    _id: string;
    _source: AlertData;
  }

  type AlertHits = AlertDataWrapper[];

  let totalNumberOfAlerts: number = 0;
  let totalIsLowerBound: boolean = false;

  // This case is due to: https://github.com/elastic/kibana/issues/56694
  const total: Total = (searchResponse?.hits?.total as unknown) as Total;
  totalNumberOfAlerts = total?.value || 0;
  totalIsLowerBound = total?.relation === 'gte' || false;

  if (totalIsLowerBound) {
    // This shouldn't happen, as we always try to fetch enough hits to satisfy the current request and the next page.
    endpointAppContext.logFactory
      .get('alerts')
      .warn('Total hits not counted accurately. Pagination numbers may be inaccurate.');
  }

  const hits: AlertHits = searchResponse?.hits?.hits;
  const hitLen: number = hits.length;

  if (reqData.searchBefore !== undefined) {
    // Reverse the hits if we used `search_before`.
    hits.reverse();
  }

  const firstTimestamp: Date = hits[0]._source['@timestamp'];
  const lastTimestamp: Date = hits[hitLen - 1]._source['@timestamp'];

  const firstEventId: number = hits[0]._source.event.id;
  const lastEventId: number = hits[hitLen - 1]._source.event.id;

  let pageUrl: string = '/api/endpoint/alerts?';
  pageUrl +=
    'filters=' +
    reqData.filters +
    '&page_size=' +
    reqData.pageSize +
    '&sort=' +
    reqData.sort +
    '&order=' +
    reqData.order;

  let next: string = pageUrl;
  let prev: string = pageUrl;

  next += '&after=' + lastTimestamp + '&after=' + lastEventId;
  prev += '&before=' + firstTimestamp + '&before=' + firstEventId;

  function mapHit(entry: AlertDataWrapper): AlertData {
    return {
      id: entry._id,
      ...entry._source,
    };
  }

  return {
    request_page_size: reqData.pageSize,
    request_page_index: reqData.pageIndex,
    result_from_index: reqData.fromIndex,
    next,
    prev,
    alerts: hits.map(mapHit),
    total: totalNumberOfAlerts,
  };
}
