/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FILTER_GROUP_LOADING = '[data-test-subj="filter-group__loading"]';
export const FILTER_GROUP_ITEMS = '[data-test-subj="filter-group__items"]';
export const FILTER_GROUP_CLEAR = '[data-test-subj="filter-group__clear"]';

export const CONTROL_FRAMES = '[data-test-subj="control-frame"]';

export const OPTION_LIST_LABELS = '.controlFrame__labelToolTip';

export const OPTION_LIST_VALUES = '.euiFilterButton__textShift';

export const OPTION_LIST_NUMBER_OFF = '.euiFilterButton__notification';

export const OPTION_LISTS_LOADING = '.optionsList--filterBtnWrapper .euiLoadingSpinner';

export const OPTION_LIST_ACTIVE_CLEAR_SELECTION =
  '[data-test-subj="optionsList-control-clear-all-selections"]';

export const OPTION_SELECTABLE = (popoverIndex: number, value: string) =>
  `#control-popover-${popoverIndex} [data-test-subj="optionsList-control-selection-${value}"]`;

export const OPTION_IGNORED = (popoverIndex: number, value: string) =>
  `#control-popover-${popoverIndex} [data-test-subj="optionsList-control-ignored-selection-${value}"]`;

export const DETECTION_PAGE_FILTER_GROUP_WRAPPER = '.filter-group__wrapper';

export const DETECTION_PAGE_FILTERS_LOADING = '.securityPageWrapper .controlFrame--controlLoading';

export const DETECTION_PAGE_FILTER_GROUP_LOADING = '[data-test-subj="filter-group__loading"]';

export const DETECTION_PAGE_FILTER_GROUP_CONTEXT_MENU = '[data-test-subj="filter-group__context"]';

export const DETECTION_PAGE_FILTER_GROUP_RESET_BUTTON =
  '[data-test-subj="filter-group__context--reset"]';
