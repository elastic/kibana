/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConditionalHeaders, ConfigObject, KbnServer, ReportingJob } from '../../../types';

export const getConditionalHeaders = ({
  job,
  filteredHeaders,
  server,
}: {
  job: ReportingJob;
  filteredHeaders: Record<string, string>;
  server: KbnServer;
}) => {
  const config: ConfigObject = server.config();

  const conditionalHeaders: ConditionalHeaders = {
    headers: filteredHeaders,
    conditions: {
      hostname: config.get('xpack.reporting.kibanaServer.hostname') || config.get('server.host'),
      port: config.get('xpack.reporting.kibanaServer.port') || config.get('server.port'),
      basePath: config.get('server.basePath'),
      protocol: config.get('xpack.reporting.kibanaServer.protocol') || server.info.protocol,
    },
  };

  return { job, conditionalHeaders, server };
};
