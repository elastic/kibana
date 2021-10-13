/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { COMPARATORS, builtInComparators } from './comparators';
export { AGGREGATION_TYPES, builtInAggregationTypes } from './aggregation_types';
export { builtInGroupByTypes } from './group_by_types';

export const VIEW_LICENSE_OPTIONS_LINK = 'https://www.elastic.co/subscriptions';
// TODO: Remove when cases connector is available across Kibana. Issue: https://github.com/elastic/kibana/issues/82502.
export const DEFAULT_HIDDEN_ACTION_TYPES = ['.case'];
