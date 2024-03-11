/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const MonitorFilterCodec = t.interface({
  label: t.string,
  count: t.number,
});

export type MonitorFilter = t.TypeOf<typeof MonitorFilterCodec>;

export const MonitorFiltersResultCodec = t.interface({
  monitorTypes: t.array(MonitorFilterCodec),
  tags: t.array(MonitorFilterCodec),
  locations: t.array(MonitorFilterCodec),
  projects: t.array(MonitorFilterCodec),
  schedules: t.array(MonitorFilterCodec),
});

export type MonitorFiltersResult = t.TypeOf<typeof MonitorFiltersResultCodec>;
