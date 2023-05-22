/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Breadcrumbs */

import { PANEL_TEST_ID, TITLE_TEST_ID } from '../../public/components/test_ids';
import { INSPECT_BUTTON_TEST_ID } from '../../public/modules/indicators/hooks/test_ids';
import {
  DROPDOWN_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID as LEGEND_FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID as LEGEND_FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID as LEGEND_POPOVER_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID as LEGEND_TIMELINE_BUTTON_TEST_ID,
} from '../../public/modules/indicators/components/barchart/test_ids';
import {
  TAKE_ACTION_BUTTON_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_TAKE_ACTION_BUTTON_TEST_ID,
  INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS,
  INDICATORS_FLYOUT_OVERVIEW_TABLE,
  CODE_BLOCK_TEST_ID,
  FLYOUT_TABLE_TEST_ID,
  INDICATORS_FLYOUT_TABS_TEST_ID,
  INDICATORS_FLYOUT_TITLE_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID as VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID as VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID as VALUE_ACTION_POPOVER_BUTTON_TEST_ID,
} from '../../public/modules/indicators/components/flyout/test_ids';
import {
  MORE_ACTIONS_TEST_ID as INDICATORS_TABLE_MORE_ACTIONS_TEST_ID,
  BUTTON_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID as CELL_FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID as CELL_FILTER_OUT_BUTTON_TEST_ID,
  TABLE_TEST_ID,
} from '../../public/modules/indicators/components/table/test_ids';

/* Indicators Table */

export const INDICATORS_TABLE = `[data-test-subj="${TABLE_TEST_ID}"]`;
export const INDICATORS_TABLE_ROW_CELL = `[data-test-subj="dataGridRowCell"]`;
export const INDICATORS_TABLE_INDICATOR_NAME_CELL = `[data-gridcell-column-id="threat.indicator.name"]`;
export const INDICATORS_TABLE_INDICATOR_TYPE_CELL = `[data-gridcell-column-id="threat.indicator.type"]`;
export const INDICATORS_TABLE_INDICATOR_NAME_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.name"]`;
export const INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.type"]`;
export const INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.feed.name"]`;
export const INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.first_seen"]`;
export const INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.last_seen"]`;
export const TABLE_CONTROLS = `[data-test-subj="dataGridControls"]`;
export const INDICATOR_TYPE_CELL = `[role="gridcell"][data-gridcell-column-id="threat.indicator.type"]`;
export const INDICATORS_TABLE_CELL_FILTER_IN_BUTTON = `[data-test-subj="${CELL_FILTER_IN_BUTTON_TEST_ID}"] button`;
export const INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON = `[data-test-subj="${CELL_FILTER_OUT_BUTTON_TEST_ID}"] button`;
export const INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_MORE_ACTIONS_TEST_ID}"]`;

/* Flyout */

export const TOGGLE_FLYOUT_BUTTON = `[data-test-subj="${BUTTON_TEST_ID}"]`;
export const FLYOUT_CLOSE_BUTTON = `[data-test-subj="euiFlyoutCloseButton"]`;
export const FLYOUT_TITLE = `[data-test-subj="${INDICATORS_FLYOUT_TITLE_TEST_ID}"]`;
export const FLYOUT_TABS = `[data-test-subj="${INDICATORS_FLYOUT_TABS_TEST_ID}"]`;
export const FLYOUT_TABLE = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}"]`;
export const FLYOUT_JSON = `[data-test-subj="${CODE_BLOCK_TEST_ID}"]`;
export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID}"]`;
export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID}"]`;
export const FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}Item"]`;
export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID}"]`;
export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID}"]`;
export const FLYOUT_TABLE_MORE_ACTIONS_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_POPOVER_BUTTON_TEST_ID}"] button`;
export const FLYOUT_BLOCK_MORE_ACTIONS_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_POPOVER_BUTTON_TEST_ID}"] button`;
export const FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}${VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID}"]`;
export const FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}${VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID}"]`;
export const FLYOUT_TAKE_ACTION_BUTTON = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_TAKE_ACTION_BUTTON_TEST_ID}"]`;

/* Field selector */

export const FIELD_SELECTOR = `[data-test-subj="${DROPDOWN_TEST_ID}"]`;
export const FIELD_SELECTOR_INPUT = `[data-test-subj="comboBoxInput"]`;
export const FIELD_SELECTOR_TOGGLE_BUTTON = `[data-test-subj="comboBoxToggleListButton"]`;
export const FIELD_SELECTOR_LIST = `[data-test-subj="comboBoxOptionsList ${DROPDOWN_TEST_ID}-optionsList"]`;

/* Field browser */

export const FIELD_BROWSER = `[data-test-subj="show-field-browser"]`;
export const FIELD_BROWSER_MODAL = `[data-test-subj="fields-browser-container"]`;

/* Barchart */

export const BARCHART_POPOVER_BUTTON = `[data-test-subj="${LEGEND_POPOVER_BUTTON_TEST_ID}"]`;
export const BARCHART_TIMELINE_BUTTON = `[data-test-subj="${LEGEND_TIMELINE_BUTTON_TEST_ID}"]`;
export const BARCHART_FILTER_IN_BUTTON = `[data-test-subj="${LEGEND_FILTER_IN_BUTTON_TEST_ID}"]`;
export const BARCHART_FILTER_OUT_BUTTON = `[data-test-subj="${LEGEND_FILTER_OUT_BUTTON_TEST_ID}"]`;

/* Miscenalleous */

export const DEFAULT_LAYOUT_TITLE = `[data-test-subj="${TITLE_TEST_ID}"]`;
export const BREADCRUMBS = `[data-test-subj="breadcrumbs"]`;
export const LEADING_BREADCRUMB = `[data-test-subj="breadcrumb first"]`;
export const ENDING_BREADCRUMB = `[data-test-subj="breadcrumb last"]`;
export const FILTERS_GLOBAL_CONTAINER = `[data-test-subj="filters-global-container"]`;
export const TIME_RANGE_PICKER = `[data-test-subj="superDatePickerToggleQuickMenuButton"]`;
export const QUERY_INPUT = `[data-test-subj="queryInput"]`;
export const EMPTY_STATE = `[data-test-subj="${PANEL_TEST_ID}"]`;
export const INSPECTOR_BUTTON = `[data-test-subj="${INSPECT_BUTTON_TEST_ID}"]`;
export const INSPECTOR_PANEL = `[data-test-subj="inspectorPanel"]`;
export const ADD_INTEGRATIONS_BUTTON = `[data-test-subj="add-data"]`;
export const REFRESH_BUTTON = `[data-test-subj="querySubmitButton"]`;
