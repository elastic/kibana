/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// All cell actions are disabled for these fields in Security
export const FIELDS_WITHOUT_CELL_ACTIONS = [
  'signal.rule.risk_score',
  'kibana.alert.risk_score',
  'signal.reason',
  'kibana.alert.reason',
];

export const CELL_ACTIONS_DEFAULT_TRIGGER = 'security-default-cellActions';
export const CELL_ACTIONS_DETAILS_FLYOUT_TRIGGER = 'security-detailsFlyout-cellActions';

export const FILTER_ACTION_TYPE = 'security-cellAction-type-filter';
export const COPY_ACTION_TYPE = 'security-cellAction-type-copyToClipboard';
export const ADD_TO_TIMELINE_ACTION_TYPE = 'security-cellAction-type-addToTimeline';
export const SHOW_TOP_N_ACTION_TYPE = 'security-cellAction-type-showTopN';
export const TOGGLE_COLUMN_ACTION_TYPE = 'security-cellAction-type-toggleColumn';
