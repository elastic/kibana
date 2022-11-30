/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const GLOBAL_SEARCH_BAR_ADD_FILTER =
  '[data-test-subj="globalDatePicker"] [data-test-subj="addFilter"]';

export const GLOBAL_SEARCH_BAR_SUBMIT_BUTTON =
  '[data-test-subj="globalDatePicker"] [data-test-subj="querySubmitButton"]';

export const ADD_FILTER_FORM_FIELD_INPUT =
  '[data-test-subj="filterFieldSuggestionList"] input[data-test-subj="comboBoxSearchInput"]';

export const ADD_FILTER_FORM_FIELD_OPTION = (value: string) =>
  `[data-test-subj="comboBoxOptionsList filterFieldSuggestionList-optionsList"] button[title="${value}"]`;

export const ADD_FILTER_FORM_OPERATOR_FIELD =
  '[data-test-subj="filterOperatorList"] input[data-test-subj="comboBoxSearchInput"]';

export const ADD_FILTER_FORM_OPERATOR_OPTION_IS =
  '[data-test-subj="comboBoxOptionsList filterOperatorList-optionsList"] button[title="is"]';

export const ADD_FILTER_FORM_FILTER_VALUE_INPUT = '[data-test-subj="filterParams"] input';

export const ADD_FILTER_FORM_SAVE_BUTTON = '[data-test-subj="saveFilter"]';

export const GLOBAL_SEARCH_BAR_FILTER_ITEM = '#popoverFor_filter0';

export const GLOBAL_SEARCH_BAR_FILTER_ITEM_AT = (value: number) => `#popoverFor_filter${value}`;

export const GLOBAL_SEARCH_BAR_PINNED_FILTER = '.globalFilterItem-isPinned';

export const GLOBAL_KQL_INPUT =
  '[data-test-subj="filters-global-container"] [data-test-subj="unifiedQueryInput"] textarea';

export const AUTO_SUGGEST_AGENT_NAME = `[data-test-subj="autocompleteSuggestion-field-agent.name-"]`;

export const AUTO_SUGGEST_HOST_NAME_VALUE = `[data-test-subj='autocompleteSuggestion-value-"siem-kibana"-']`;
