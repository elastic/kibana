/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AddOptionsListControlProps } from '@kbn/controls-plugin/public';

export const TEST_IDS = {
  FILTER_CONTROLS: 'filter-group__items',
  FILTER_LOADING: 'filter-group__loading',
  MOCKED_CONTROL: 'mocked_control_group',
  ADD_CONTROL: 'filter-group__add-control',
  SAVE_CONTROL: 'filter-group__save',
  SAVE_CHANGE_POPOVER: 'filter-group__save-popover',
  FILTERS_CHANGED_BANNER: 'filter-group--changed-banner',
  FILTERS_CHANGED_BANNER_SAVE: 'filter-group__save',
  FILTERS_CHANGED_BANNER_DISCARD: 'filter-group__discard',
  CONTEXT_MENU: {
    BTN: 'filter-group__context',
    MENU: 'filter-group__context-menu',
    RESET: 'filter-group__context--reset',
    EDIT: 'filter-group__context--edit',
    DISCARD: `filter-group__context--discard`,
  },
  FILTER_BY_ASSIGNEES_BUTTON: 'filter-popover-button-assignees',
};

export const COMMON_OPTIONS_LIST_CONTROL_INPUTS: Partial<AddOptionsListControlProps> = {
  hideExclude: true,
  hideSort: true,
  hidePanelTitles: true,
  placeholder: '',
  ignoreParentSettings: {
    ignoreValidations: true,
  },
};

export const TIMEOUTS = {
  /* because of recent changes in controls-plugin debounce time may not be needed
   * still keeping the config for some time for any recent changes
   * */
  FILTER_UPDATES_DEBOUNCE_TIME: 0,
};
