/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable no-console */
import { AggregationSearchResponse, SearchParams } from 'elasticsearch';
import { Legacy } from 'kibana';
import moment from 'moment';

function decodeEsQuery(esQuery?: string): object {
  return esQuery ? JSON.parse(decodeURIComponent(esQuery)) : null;
}

export type ESClient = <T = void, U = void>(
  type: string,
  params: SearchParams
) => Promise<AggregationSearchResponse<T, U>>;

export interface Setup {
  start: number;
  end: number;
  esFilterQuery?: any;
  client: ESClient;
  config: Legacy.KibanaConfig;
}

interface APMRequestQuery {
  _debug: string;
  start: string;
  end: string;
  esFilterQuery: string;
}

export function setupRequest(req: Legacy.Request): Setup {
  const query = (req.query as unknown) as APMRequestQuery;
  const cluster = req.server.plugins.elasticsearch.getCluster('data');

  const client: ESClient = (type, params) => {
    if (query._debug) {
      console.log(`DEBUG ES QUERY:`);
      console.log(
        `${req.method.toUpperCase()} ${req.url.pathname} ${JSON.stringify(
          query
        )}`
      );
      console.log(`GET ${params.index}/_search`);
      console.log(JSON.stringify(params.body, null, 4));
    }

    const nextParams = {
      ...params,
      rest_total_hits_as_int: true // ensure that ES returns accurate hits.total with pre-6.6 format
    };
    return cluster.callWithRequest(req, type, nextParams);
  };

  return {
    start: moment.utc(query.start).valueOf(),
    end: moment.utc(query.end).valueOf(),
    esFilterQuery: decodeEsQuery(query.esFilterQuery),
    client,
    config: req.server.config()
  };
}
