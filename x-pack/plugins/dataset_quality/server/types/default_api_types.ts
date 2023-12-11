/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';

export const dataStreamTypesRt = t.partial({
  type: t.union([
    t.literal('logs'),
    t.literal('metrics'),
    t.literal('traces'),
    t.literal('synthetics'),
    t.literal('profiling'),
  ]),
});

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});
