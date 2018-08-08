/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { oncePerServer } from '../../../../server/lib/once_per_server';

function getAbsoluteUrlFn(server) {
  const config = server.config();

  return function getAbsoluteUrl({
    hash,
    path = '/app/kibana',
    search
  } = {}) {
    return url.format({
      protocol: config.get('xpack.reporting.kibanaServer.protocol') || server.info.protocol,
      hostname: config.get('xpack.reporting.kibanaServer.hostname') || config.get('server.host'),
      port: config.get('xpack.reporting.kibanaServer.port') || config.get('server.port'),
      pathname: config.get('server.basePath') + path,
      hash: hash,
      search
    });
  };
}

export const getAbsoluteUrlFactory = oncePerServer(getAbsoluteUrlFn);
