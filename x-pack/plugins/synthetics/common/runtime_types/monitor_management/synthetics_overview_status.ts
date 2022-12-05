/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const OverviewStatusMetaDataCodec = t.interface({
  monitorQueryId: t.string,
  configId: t.string,
  location: t.string,
  status: t.string,
});

export const OverviewStatusCodec = t.interface({
  up: t.number,
  down: t.number,
  disabledCount: t.number,
  upConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  downConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  enabledIds: t.array(t.string),
});

export const OverviewStatusStateCodec = t.intersection([
  OverviewStatusCodec,
  t.interface({
    allConfigs: t.record(t.string, OverviewStatusMetaDataCodec),
  }),
]);

export type OverviewStatus = t.TypeOf<typeof OverviewStatusCodec>;
export type OverviewStatusState = t.TypeOf<typeof OverviewStatusStateCodec>;
export type OverviewStatusMetaData = t.TypeOf<typeof OverviewStatusMetaDataCodec>;
