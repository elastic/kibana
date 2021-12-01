/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { ConfigKey } from './config_key';
import { DataStreamCodec, ScheduleUnitCodec } from './monitor_configs';

const Schedule = t.interface({
  number: t.string,
  unit: ScheduleUnitCodec,
});

// CommonFields
export const CommonFieldsCodec = t.interface({
  [ConfigKey.MONITOR_TYPE]: DataStreamCodec,
  [ConfigKey.SCHEDULE]: Schedule,
  [ConfigKey.APM_SERVICE_NAME]: t.string,
  [ConfigKey.TIMEOUT]: t.string,
  [ConfigKey.TAGS]: t.array(t.string),
});

export type CommonFields = t.TypeOf<typeof CommonFieldsCodec>;
