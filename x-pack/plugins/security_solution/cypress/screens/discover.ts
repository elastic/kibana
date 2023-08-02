/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector, getDataTestSubjectSelectorStartWith } from '../helpers/common';

export const DISCOVER_CONTAINER_TEST_ID = 'timeline-embedded-discover';
export const DISCOVER_CONTAINER = getDataTestSubjectSelector(DISCOVER_CONTAINER_TEST_ID);

export const DISCOVER_DATA_VIEW_SWITCHER = {
  BTN: getDataTestSubjectSelector('discover-dataView-switch-link'),
  INPUT: getDataTestSubjectSelector('indexPattern-switcher--input'),
  GET_DATA_VIEW: (title: string) => `.euiSelectableListItem[role=option][title^="${title}"]`,
};
export const DISCOVER_QUERY_INPUT = `${DISCOVER_CONTAINER} ${getDataTestSubjectSelector(
  'unifiedQueryInput'
)}`;

export const DISCOVER_ADD_FILTER = `${DISCOVER_CONTAINER} ${getDataTestSubjectSelector(
  'addFilter'
)}`;

export const DISCOVER_FILTER_BADGES = `${DISCOVER_CONTAINER} ${getDataTestSubjectSelectorStartWith(
  'filter-badge-'
)}`;

export const DISCOVER_RESULT_HITS = getDataTestSubjectSelector('unifiedHistogramQueryHits');

export const DISCOVER_FIELDS_LOADING = getDataTestSubjectSelector(
  'fieldListGroupedAvailableFields-countLoading'
);

export const DISCOVER_DATA_GRID_UPDATING = getDataTestSubjectSelector('discoverDataGridUpdating');

export const DISCOVER_DATA_GRID_LOADING = getDataTestSubjectSelector('discoverDataGridLoading');

export const DISCOVER_NO_RESULTS = getDataTestSubjectSelector('discoverNoResults');

export const DISCOVER_FILTER_FORM = {
  ADD_FILTER_FORM_FIELD_INPUT: `${DISCOVER_CONTAINER} [data-test-subj="filterFieldSuggestionList"] input[data-test-subj="comboBoxSearchInput"]`,
  ADD_FILTER_FORM_FIELD_OPTION: (value: string) =>
    `${DISCOVER_CONTAINER} [data-test-subj="comboBoxOptionsList filterFieldSuggestionList-optionsList"] button[title="${value}"]`,
  ADD_FILTER_FORM_OPERATOR_FIELD: `${DISCOVER_CONTAINER} [data-test-subj="filterOperatorList"] input[data-test-subj="comboBoxSearchInput"]`,
  ADD_FILTER_FORM_OPERATOR_OPTION_IS: `${DISCOVER_CONTAINER} [data-test-subj="comboBoxOptionsList filterOperatorList-optionsList"] button[title="is"]`,
  ADD_FILTER_FORM_FILTER_VALUE_INPUT: `${DISCOVER_CONTAINER} [data-test-subj="filterParams"] input`,
  ADD_FILTER_FORM_SAVE_BUTTON: `${DISCOVER_CONTAINER} [data-test-subj="saveFilter"]`,
};

export const DISCOVER_TABLE = getDataTestSubjectSelector('docTable');

export const GET_DISCOVER_DATA_GRID_CELL = (columnId: string, rowIndex: number) => {
  return `${DISCOVER_TABLE} ${getDataTestSubjectSelector(
    'dataGridRowCell'
  )}[data-gridcell-column-id="${columnId}"][data-gridcell-row-index="${rowIndex}"] .dscDiscoverGrid__cellValue`;
};

export const DISCOVER_CELL_ACTIONS = {
  FILTER_FOR: getDataTestSubjectSelector('filterForButton'),
  FILTER_OUT: getDataTestSubjectSelector('filterOutButton'),
  EXPAND_CELL_ACTIONS: getDataTestSubjectSelector('euiDataGridCellExpandButton'),
  EXPANSION_POPOVER: getDataTestSubjectSelector('euiDataGridExpansionPopover'),
  COPY: getDataTestSubjectSelector('copyClipboardButton'),
};
