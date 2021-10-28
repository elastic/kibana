/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Registry } from '@kbn/interpreter/common';
import { FilterView } from './filter_view';
import type { FilterView as FilterViewType, FilterViewSpec } from './filter_view';

class FilterViewsRegistry extends Registry<FilterViewSpec, FilterViewType> {
  wrapper(filterViewSpec: FilterViewSpec): FilterViewType {
    return new FilterView(filterViewSpec);
  }
}

export const filterViewsRegistry = new FilterViewsRegistry();
