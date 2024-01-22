/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { checkTimeRangeRT } from './common';
import { checkResultRT } from './result';

export const dataStreamQualityCheckExecutionRT = rt.strict({
  id: rt.string,
  started: rt.string,
  finished: rt.string,
  result: checkResultRT,
});

export type DataStreamQualityCheckExecution = rt.TypeOf<typeof dataStreamQualityCheckExecutionRT>;

export const dataStreamQualityCheckArgumentsRT = rt.strict({
  dataStream: rt.string,
  timeRange: checkTimeRangeRT,
});

export type DataStreamQualityCheckArguments = rt.TypeOf<typeof dataStreamQualityCheckArgumentsRT>;
