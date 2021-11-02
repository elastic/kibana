/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FilterViewSpec, filterViewsRegistry } from '../../../filter_view_types';
import { filterViewsSpecs } from '../../../../canvas_plugin_src/canvas_addons';

export const prepareFilterViews = () =>
  filterViewsSpecs.forEach((filterView) =>
    filterViewsRegistry.register(() => filterView as FilterViewSpec<any>)
  );
