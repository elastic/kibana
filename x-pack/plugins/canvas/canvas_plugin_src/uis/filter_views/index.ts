/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterViewSpec } from '../../../public/filter_view_types/intex';
import { defaultFilter } from './default_filter';
import { timeFilter } from './time_filter';

export const filterViewsSpecs: FilterViewSpec[] = [defaultFilter, timeFilter];
