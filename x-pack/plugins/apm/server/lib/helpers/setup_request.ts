/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable no-console */
import { SearchParams, SearchResponse } from 'elasticsearch';
import moment from 'moment';
import { KibanaConfig, Request } from 'src/server/kbn_server';

function decodeEsQuery(esQuery?: string): object {
  return esQuery ? JSON.parse(decodeURIComponent(esQuery)) : null;
}

type Client<T> = (type: string, params: SearchParams) => SearchResponse<T>;

export interface Setup<T = any> {
  start: number;
  end: number;
  esFilterQuery: any;
  client: Client<T>;
  config: KibanaConfig;
}

interface APMRequestQuery {
  _debug: string;
  start: string;
  end: string;
  esFilterQuery: string;
}

export function setupRequest(req: Request) {
  const query = (req.query as unknown) as APMRequestQuery;
  const cluster = req.server.plugins.elasticsearch.getCluster('data');

  function client<T>(
    type: string,
    params: SearchParams
  ): Promise<SearchResponse<T>> {
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
    return cluster.callWithRequest<SearchResponse<T>>(req, type, params);
  }

  return {
    start: moment.utc(query.start).valueOf(),
    end: moment.utc(query.end).valueOf(),
    esFilterQuery: decodeEsQuery(query.esFilterQuery),
    client,
    config: req.server.config()
  };
}
