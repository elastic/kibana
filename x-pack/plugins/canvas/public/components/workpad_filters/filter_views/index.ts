/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterViewSpec } from '../../../../types';
import { defaultFilter } from './default_filter';
import { timeFilter } from './time_filter';

export const filterViews: Record<string, FilterViewSpec<any>> = {
  [defaultFilter.name]: defaultFilter,
  [timeFilter.name]: timeFilter,
};
