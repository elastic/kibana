/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const  getConditionalHeaders = ({ job, filteredHeaders, server }) => {
  const config = server.config();

  const conditionalHeaders = {
    headers: filteredHeaders,
    conditions: {
      hostname: config.get('xpack.reporting.kibanaServer.hostname') || config.get('server.host'),
      port: config.get('xpack.reporting.kibanaServer.port') || config.get('server.port'),
      basePath: config.get('server.basePath'),
      protocol: config.get('xpack.reporting.kibanaServer.protocol') || server.info.protocol,
    }
  };

  return { job, conditionalHeaders, server };
};