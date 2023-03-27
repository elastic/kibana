/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostSortField } from '../../../common/http_api/hosts';

export const METADATA_FIELD = 'metadata';
export const SORTFIELD_BY_AGGREGATION: Partial<Record<HostSortField, string>> = {
  name: '_key',
  cpu: 'cpu>result',
  diskLatency: 'diskLatency>result',
  rx: 'rx>result',
  tx: 'tx>result',
} as const;
