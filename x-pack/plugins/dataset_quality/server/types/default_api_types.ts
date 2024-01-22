/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';
import { dataStreamTypeRT } from '../../common';

export const dataStreamTypesRt = dataStreamTypeRT;

export type DataStreamTypes = t.TypeOf<typeof dataStreamTypesRt>;

export const typeRt = t.partial({
  type: dataStreamTypesRt,
});

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});
