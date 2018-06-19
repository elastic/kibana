/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
import moment from 'moment';

function decodeEsQuery(esQuery) {
  return esQuery ? JSON.parse(decodeURIComponent(esQuery)) : null;
}

export function setupRequest(req, reply) {
  const cluster = req.server.plugins.elasticsearch.getCluster('data');

  const setup = {
    start: moment.utc(req.query.start).valueOf(),
    end: moment.utc(req.query.end).valueOf(),
    esFilterQuery: decodeEsQuery(req.query.esFilterQuery),
    client: (type, params) => {
      if (req.query._debug) {
        console.log(`DEBUG ES QUERY:`);
        console.log(
          `${req.method.toUpperCase()} ${req.url.pathname} ${JSON.stringify(
            req.query
          )}`
        );
        console.log(JSON.stringify(params.body, null, 4));
      }
      return cluster.callWithRequest(req, type, params);
    },
    config: req.server.config()
  };

  reply(setup);
}
