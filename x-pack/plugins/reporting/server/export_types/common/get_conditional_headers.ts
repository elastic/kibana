/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingConfig } from '../../';
import { ConditionalHeaders } from './';

export const getConditionalHeaders = (
  config: ReportingConfig,
  filteredHeaders: Record<string, string>
) => {
  const { kbnConfig } = config;
  const [hostname, port, basePath, protocol] = [
    config.get('kibanaServer', 'hostname'),
    config.get('kibanaServer', 'port'),
    kbnConfig.get('server', 'basePath'),
    config.get('kibanaServer', 'protocol'),
  ] as [string, number, string, string];

  const conditionalHeaders: ConditionalHeaders = {
    headers: filteredHeaders,
    conditions: {
      hostname: hostname ? hostname.toLowerCase() : hostname,
      port,
      basePath,
      protocol,
    },
  };

  return conditionalHeaders;
};
