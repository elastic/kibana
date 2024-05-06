/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { COMPARATORS, builtInComparators } from './comparators';
export { AGGREGATION_TYPES, builtInAggregationTypes } from './aggregation_types';
export { loadAllActions, loadActionTypes } from '../../application/lib/action_connector_api';
export { ConnectorAddModal } from '../../application/sections/action_connector_form';
export type { ActionConnector } from '../..';

export { builtInGroupByTypes } from './group_by_types';
export * from './action_frequency_types';

export const VIEW_LICENSE_OPTIONS_LINK = 'https://www.elastic.co/subscriptions';

export const PLUGIN_ID = 'triggersActions';
export const ALERTS_PLUGIN_ID = 'triggersActionsAlerts';
export const CONNECTORS_PLUGIN_ID = 'triggersActionsConnectors';
export * from './i18n_weekdays';
