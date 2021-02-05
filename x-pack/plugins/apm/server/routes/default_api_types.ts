/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { dateAsTimestampRt } from '../../common/runtime_types/date_as_timestamp_rt';

export const rangeRt = t.type({
  start: dateAsTimestampRt,
  end: dateAsTimestampRt,
});

export const comparisonRangeRt = t.partial({
  comparisonStart: dateAsTimestampRt,
  comparisonEnd: dateAsTimestampRt,
});

export const uiFiltersRt = t.type({ uiFilters: t.string });
