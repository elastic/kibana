/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';

// TODO: https://github.com/elastic/kibana/issues/125642 Add JSDoc comments

export interface StatsHistory<TStats> {
  buckets: Array<StatsBucket<TStats>>;
}

export interface StatsBucket<TStats> {
  timestamp: IsoDateString;
  stats: TStats;
}
