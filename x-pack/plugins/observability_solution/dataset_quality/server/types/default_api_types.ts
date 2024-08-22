/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import rison from '@kbn/rison';
import { DataStreamType, dataStreamTypesRt } from '../../common/types';

export const typeRt = t.partial({
  type: dataStreamTypesRt,
});

export const typesRt = new t.Type<string, DataStreamType[], unknown>(
  'typesRt',
  (input: unknown): input is string =>
    typeof input === 'string' && input.split(',').every((value) => dataStreamTypesRt.is(value)),
  (input, context) =>
    typeof input === 'string' && input.split(',').every((value) => dataStreamTypesRt.is(value))
      ? t.success(input)
      : t.failure(input, context),
  (input) => rison.decodeArray(input) as DataStreamType[]
);

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});
