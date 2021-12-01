/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export * from './state';
export * from './config_key';
export * from './monitor_configs';
export * from './monitor_meta_data';
export * from './monitor_types';

export const MonitorManagementListResultType = t.type({
  monitors: t.array(t.unknown),
  page: t.union([t.number, t.null]),
  perPage: t.union([t.number, t.null]),
  total: t.union([t.number, t.null]),
});

export type MonitorManagementListResult = t.TypeOf<typeof MonitorManagementListResultType>;
