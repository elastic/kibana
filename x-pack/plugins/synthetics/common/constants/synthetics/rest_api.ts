/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SYNTHETICS_API_URLS {
  SYNTHETICS_OVERVIEW = '/internal/synthetics/overview',
  PINGS = '/internal/synthetics/pings',
  PING_STATUSES = '/internal/synthetics/ping_statuses',
  OVERVIEW_STATUS = `/internal/synthetics/overview/status`,
  INDEX_SIZE = `/internal/synthetics/index_size`,
  PARAMS = `/synthetics/params`,
  SYNC_GLOBAL_PARAMS = `/synthetics/sync_global_params`,
  ENABLE_DEFAULT_ALERTING = `/synthetics/enable_default_alerting`,
  JOURNEY = `/internal/synthetics/journey/{checkGroup}`,
}
