/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isoToEpochRt } from '../../common/runtime_types/iso_to_epoch_rt';

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});

export const comparisonRangeRt = t.partial({
  comparisonStart: isoToEpochRt,
  comparisonEnd: isoToEpochRt,
});

export const environmentRt = t.partial({ environment: t.string });

export const uiFiltersRt = t.type({ uiFilters: t.string });
