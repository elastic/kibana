/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';
import { CanvasFiltersService } from '../filters';

export type CanvasFiltersServiceFactory = PluginServiceFactory<CanvasFiltersService, {}>;

const noop = (..._args: any[]): any => {};

export const filtersServiceFactory: CanvasFiltersServiceFactory = () => ({
  getFilters: () => [
    'exactly value="machine-learning" column="project1" filterGroup="Group 1"',
    'exactly value="kibana" column="project2" filterGroup="Group 1"',
    'time column="@timestamp1" from="2021-11-02 17:13:18" to="2021-11-09 17:13:18" filterGroup="Some group"',
  ],
  updateFilter: noop,
  getFiltersContext: () => ({ variables: {} }),
});
