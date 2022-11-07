/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const OverviewStatusMetaDataCodec = t.interface({
  heartbeatId: t.string,
  configId: t.string,
  location: t.string,
});

export const OverviewStatusType = t.type({
  up: t.number,
  down: t.number,
  disabledCount: t.number,
  upConfigs: t.array(OverviewStatusMetaDataCodec),
  downConfigs: t.array(OverviewStatusMetaDataCodec),
});

export type OverviewStatus = t.TypeOf<typeof OverviewStatusType>;
export type OverviewStatusMetaData = t.TypeOf<typeof OverviewStatusMetaDataCodec>;
