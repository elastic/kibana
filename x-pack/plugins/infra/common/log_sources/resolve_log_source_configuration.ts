/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogSourceConfigurationProperties } from '../http_api/log_sources';

// NOTE: Type will change, see below.
type ResolvedLogsSourceConfiguration = LogSourceConfigurationProperties;

// NOTE: This will handle real resolution for https://github.com/elastic/kibana/issues/92650, via the index patterns service, but for now just
// hands back properties from the saved object (and therefore looks pointless...).
export const resolveLogSourceConfiguration = (
  sourceConfiguration: LogSourceConfigurationProperties
): ResolvedLogsSourceConfiguration => {
  return sourceConfiguration;
};
