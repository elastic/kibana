/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TOAST_ERROR = '.euiToast--danger';

export const TOP_N_ALERT_HISTOGRAM =
  '[data-test-subj="topN-container"] [data-test-subj="alerts-histogram-panel"]';

export const TOP_N_CONTAINER = '[data-test-subj="topN-container"]';

export const TOP_N_CONTAINER_CLOSE_BTN =
  '[data-test-subj="topN-container"] [data-test-subj="close"]';

export const ID_COLUMN_VALUES = '[data-test-subj="formatted-field-_id"]';

export const GET_DATA_GRID_HEADER = (fieldName: string) => {
  return `[data-test-subj="dataGridHeaderCell-${fieldName}"]`;
};

export const DATA_GRID_FIELDS = {
  TIMESTAMP: {
    fieldName: '@timestamp',
    label: '@timestamp',
  },
  ID: {
    fieldName: '_id',
    label: '_id',
  },
  RISK_SCORE: {
    fieldName: 'kibana.alert.risk_score',
    label: 'Risk Score',
  },

  RULE: {
    fieldName: 'kibana.alert.rule.name',
    label: 'Rule',
  },
};

export const GET_DATA_GRID_HEADER_CELL_ACTION_GROUP = (fieldName: string) => {
  return `[data-test-subj="dataGridHeaderCellActionGroup-${fieldName}"]`;
};

export const DATA_GRID_FULL_SCREEN = '[data-test-subj="dataGridFullScreenButton"]';

export const DATA_GRID_HEADERS = {
  ID: '[data-gridcell-column-id="_id"]',
  TIMESTAMP: '[data-test-subj="dataGridHeaderCell-@timestamp"]',
};

export const ID_COLUMN_NAME = '_id';

export const DATA_GRID_FIELD_SORT_BTN = '[data-test-subj="dataGridColumnSortingButton"]';

export const DATA_GRID_COLUMN_ORDER_BTN = '[data-test-subj="dataGridColumnSelectorButton"]';

export const DATA_GRID_COLUMNS = '.euiDataGridHeaderCell__content';

export const COLUMN_ORDER_POPUP = {
  TIMESTAMP: '[data-test-subj="dataGridColumnSelectorColumnItem-@timestamp"]',
  REASON: '[data-test-subj="dataGridColumnSelectorColumnItem-kibana.alert.reason"]',
};
