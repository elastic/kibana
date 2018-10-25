/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable no-console */
import { SearchParams, SearchResponse } from 'elasticsearch';
import { Request, Server } from 'hapi';
import moment from 'moment';

function decodeEsQuery(esQuery?: string): object {
  return esQuery ? JSON.parse(decodeURIComponent(esQuery)) : null;
}

interface KibanaServer extends Server {
  config: () => KibanaConfig;
}

interface KibanaRequest extends Request {
  server: KibanaServer;
}

interface KibanaConfig {
  get: (key: string) => any;
}

type Client<T> = (type: string, params: SearchParams) => SearchResponse<T>;

export interface Setup<T = any> {
  start: number;
  end: number;
  esFilterQuery: any;
  client: Client<T>;
  config: KibanaConfig;
}

export function setupRequest(
  req: KibanaRequest,
  reply: (setup: Setup) => void
) {
  const cluster = req.server.plugins.elasticsearch.getCluster('data');

  function client<T>(type: string, params: SearchParams): SearchResponse<T> {
    if (req.query._debug) {
      console.log(`DEBUG ES QUERY:`);
      console.log(
        `${req.method.toUpperCase()} ${req.url.pathname} ${JSON.stringify(
          req.query
        )}`
      );
      console.log(`GET ${params.index}/_search`);
      console.log(JSON.stringify(params.body, null, 4));
    }
    return cluster.callWithRequest(req, type, params);
  }

  const setup = {
    start: moment.utc(req.query.start).valueOf(),
    end: moment.utc(req.query.end).valueOf(),
    esFilterQuery: decodeEsQuery(req.query.esFilterQuery),
    client,
    config: req.server.config()
  };

  reply(setup);
}
