/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createFilterInAction as createDefaultFilterInAction } from './default/filter_in';
export { createFilterOutAction as createDefaultFilterOutAction } from './default/filter_out';

export { createFilterInAction as createTimelineFilterInAction } from './timeline/filter_in';
export { createFilterOutAction as createTimelineFilterOutAction } from './timeline/filter_out';
