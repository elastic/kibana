/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { dateAsStringRt } from '../../common/runtime_types/date_as_string_rt';

export const rangeRt = t.type({
  start: dateAsStringRt,
  end: dateAsStringRt,
});

export const uiFiltersRt = t.type({ uiFilters: t.string });
