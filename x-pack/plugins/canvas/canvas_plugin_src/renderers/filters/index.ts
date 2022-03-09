/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { advancedFilterFactory } from './advanced_filter';
import { dropdownFilterFactory } from './dropdown_filter';
import { timeFilterFactory } from './time_filter';

export const renderFunctions = [];
export const renderFunctionFactories = [
  timeFilterFactory,
  dropdownFilterFactory,
  advancedFilterFactory,
];
