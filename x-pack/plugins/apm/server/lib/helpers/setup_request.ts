/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* tslint:disable no-console */
import { SearchParams, SearchResponse } from 'elasticsearch';
import moment from 'moment';
import { Url } from 'url';
import { StringMap } from '../../../typings/common';

function decodeEsQuery(esQuery?: string): object {
  return esQuery ? JSON.parse(decodeURIComponent(esQuery)) : null;
}

// TODO: get these from hapi
interface Request {
  query: StringMap;
  server: any;
  method: string;
  url: Url;
}

interface ServerConfig {
  get: (key: string) => any;
}

type Client<T> = (type: string, params: SearchParams) => SearchResponse<T>;

export interface Setup<T = any> {
  start: number;
  end: number;
  esFilterQuery: object;
  client: Client<T>;
  config: ServerConfig;
}

export function setupRequest(req: Request, reply: (setup: Setup) => void) {
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
