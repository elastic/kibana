/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Breadcrumbs */

import { INSPECT_BUTTON_TEST_ID } from '../../public/modules/indicators/components/table/hooks/test_ids';
import { PANEL_TEST_ID } from '../../public/components/empty_state/test_ids';
import {
  FILTER_IN_BUTTON_TEST_ID as LEGEND_FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID as LEGEND_FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID as LEGEND_POPOVER_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID as LEGEND_TIMELINE_BUTTON_TEST_ID,
} from '../../public/modules/indicators/components/barchart/legend_action/test_ids';
import { DROPDOWN_TEST_ID } from '../../public/modules/indicators/components/barchart/field_selector/test_ids';
import {
  ADD_TO_BLOCK_LIST_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_BLOCK_LIST_TEST_ID,
  ADD_TO_EXISTING_CASE_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_EXISTING_CASE_TEST_ID,
  ADD_TO_NEW_CASE_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_NEW_CASE_TEST_ID,
  INVESTIGATE_IN_TIMELINE_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_INVESTIGATE_IN_TIMELINE_TEST_ID,
  TAKE_ACTION_BUTTON_TEST_ID as INDICATOR_FLYOUT_TAKE_ACTION_TAKE_ACTION_BUTTON_TEST_ID,
} from '../../public/modules/indicators/components/flyout/take_action/test_ids';
import {
  INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS,
  INDICATORS_FLYOUT_OVERVIEW_TABLE,
} from '../../public/modules/indicators/components/flyout/overview_tab/test_ids';
import { CODE_BLOCK_TEST_ID } from '../../public/modules/indicators/components/flyout/json_tab/test_ids';
import { FLYOUT_TABLE_TEST_ID } from '../../public/modules/indicators/components/flyout/table_tab/test_ids';
import {
  INDICATORS_FLYOUT_TABS_TEST_ID,
  INDICATORS_FLYOUT_TITLE_TEST_ID,
} from '../../public/modules/indicators/components/flyout/test_ids';
import {
  ADD_TO_BLOCK_LIST_TEST_ID as INDICATORS_TABLE_ADD_TO_BLOCK_LIST_TEST_ID,
  ADD_TO_EXISTING_TEST_ID as INDICATORS_TABLE_ADD_TO_EXISTING_TEST_ID,
  ADD_TO_NEW_CASE_TEST_ID as INDICATORS_TABLE_ADD_TO_NEW_CASE_TEST_ID,
  MORE_ACTIONS_TEST_ID as INDICATORS_TABLE_MORE_ACTIONS_TEST_ID,
} from '../../public/modules/indicators/components/table/components/more_actions/test_ids';
import { BUTTON_TEST_ID } from '../../public/modules/indicators/components/table/components/open_flyout_button/test_ids';
import {
  FILTER_IN_BUTTON_TEST_ID as CELL_FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID as CELL_FILTER_OUT_BUTTON_TEST_ID,
  TIMELINE_BUTTON_TEST_ID as CELL_TIMELINE_BUTTON_TEST_ID,
  INVESTIGATE_IN_TIMELINE_TEST_ID as CELL_INVESTIGATE_IN_TIMELINE_TEST_ID,
} from '../../public/modules/indicators/components/table/components/test_ids';
import { TABLE_TEST_ID } from '../../public/modules/indicators/components/table/test_ids';
import { TITLE_TEST_ID } from '../../public/components/layout/test_ids';
import {
  TIMELINE_BUTTON_TEST_ID as VALUE_ACTION_TIMELINE_BUTTON_TEST_ID,
  FILTER_IN_BUTTON_TEST_ID as VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID,
  FILTER_OUT_BUTTON_TEST_ID as VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID,
  POPOVER_BUTTON_TEST_ID as VALUE_ACTION_POPOVER_BUTTON_TEST_ID,
} from '../../public/modules/indicators/components/flyout/indicator_value_actions/test_ids';

export const BREADCRUMBS = `[data-test-subj="breadcrumbs"]`;

export const LEADING_BREADCRUMB = `[data-test-subj="breadcrumb first"]`;

export const ENDING_BREADCRUMB = `[data-test-subj="breadcrumb last"]`;

/* Title */

export const DEFAULT_LAYOUT_TITLE = `[data-test-subj="${TITLE_TEST_ID}"]`;

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

export const INDICATORS_TABLE_CELL_TIMELINE_BUTTON = `[data-test-subj="${CELL_TIMELINE_BUTTON_TEST_ID}"] button`;

export const INDICATORS_TABLE_CELL_FILTER_IN_BUTTON = `[data-test-subj="${CELL_FILTER_IN_BUTTON_TEST_ID}"] button`;

export const INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON = `[data-test-subj="${CELL_FILTER_OUT_BUTTON_TEST_ID}"] button`;

export const INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON = `[data-test-subj="${CELL_INVESTIGATE_IN_TIMELINE_TEST_ID}"]`;

export const INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_MORE_ACTIONS_TEST_ID}"]`;

export const INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_ADD_TO_NEW_CASE_TEST_ID}"]`;

export const INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_ADD_TO_EXISTING_TEST_ID}"]`;

export const INDICATORS_TABLE_ADD_TO_BLOCK_LIST_BUTTON_ICON = `[data-test-subj="${INDICATORS_TABLE_ADD_TO_BLOCK_LIST_TEST_ID}"]`;

/* Flyout */

export const TOGGLE_FLYOUT_BUTTON = `[data-test-subj="${BUTTON_TEST_ID}"]`;

export const FLYOUT_CLOSE_BUTTON = `[data-test-subj="euiFlyoutCloseButton"]`;

export const FLYOUT_TITLE = `[data-test-subj="${INDICATORS_FLYOUT_TITLE_TEST_ID}"]`;

export const FLYOUT_TABS = `[data-test-subj="${INDICATORS_FLYOUT_TABS_TEST_ID}"]`;

export const FLYOUT_TABLE = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}"]`;

export const FLYOUT_JSON = `[data-test-subj="${CODE_BLOCK_TEST_ID}"]`;

export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_TIMELINE_BUTTON_TEST_ID}"]`;

export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID}"]`;

export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID}"]`;

export const FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}Item"]`;

export const FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_TIMELINE_BUTTON_TEST_ID}"]`;

export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID}"]`;

export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID}"]`;

export const FLYOUT_TABLE_MORE_ACTIONS_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_TABLE}${VALUE_ACTION_POPOVER_BUTTON_TEST_ID}"] button`;

export const FLYOUT_BLOCK_MORE_ACTIONS_BUTTON = `[data-test-subj="${INDICATORS_FLYOUT_OVERVIEW_HIGH_LEVEL_BLOCKS}${VALUE_ACTION_POPOVER_BUTTON_TEST_ID}"] button`;

export const FLYOUT_TABLE_TAB_ROW_TIMELINE_BUTTON = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}${VALUE_ACTION_TIMELINE_BUTTON_TEST_ID}"]`;

export const FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}${VALUE_ACTION_FILTER_IN_BUTTON_TEST_ID}"]`;

export const FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON = `[data-test-subj="${FLYOUT_TABLE_TEST_ID}${VALUE_ACTION_FILTER_OUT_BUTTON_TEST_ID}"]`;

export const FLYOUT_TAKE_ACTION_BUTTON = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_TAKE_ACTION_BUTTON_TEST_ID}"]`;

export const FLYOUT_ADD_TO_EXISTING_CASE_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_EXISTING_CASE_TEST_ID}"]`;

export const FLYOUT_ADD_TO_NEW_CASE_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_NEW_CASE_TEST_ID}"]`;

export const FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_INVESTIGATE_IN_TIMELINE_TEST_ID}"]`;

export const FLYOUT_ADD_TO_BLOCK_LIST_ITEM = `[data-test-subj="${INDICATOR_FLYOUT_TAKE_ACTION_ADD_TO_BLOCK_LIST_TEST_ID}"]`;

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

/* Cases */

export const CREAT_CASE_BUTTON = `[data-test-subj="createNewCaseBtn"]`;

export const SELECT_EXISTING_CASE = `[class="eui-textTruncate"]`;

export const VIEW_CASE_TOASTER_LINK = `[data-test-subj="toaster-content-case-view-link"]`;

export const CASE_COMMENT_EXTERNAL_REFERENCE = `[data-test-subj="comment-externalReference-indicator"]`;

export const CASE_ACTION_WRAPPER = `[data-test-subj="case-action-bar-wrapper"]`;

export const CASE_ELLIPSE_BUTTON = `[data-test-subj="property-actions-ellipses"]`;

export const CASE_ELLIPSE_DELETE_CASE_OPTION = `[data-test-subj="property-actions-trash"]`;

export const CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON = `[data-test-subj="confirmModalConfirmButton"]`;

export const NEW_CASE_NAME_INPUT = `[data-test-subj="input"][aria-describedby="caseTitle"]`;

export const NEW_CASE_DESCRIPTION_INPUT = `[data-test-subj="euiMarkdownEditorTextArea"]`;

export const NEW_CASE_CREATE_BUTTON = `[data-test-subj="create-case-submit"]`;

/* Block list */

export const BLOCK_LIST_NAME = '[data-test-subj="blocklist-form-name-input"]';

export const BLOCK_LIST_DESCRIPTION = '[data-test-subj="blocklist-form-description-input"]';

export const BLOCK_LIST_ADD_BUTTON = '[class="eui-textTruncate"]';

export const BLOCK_LIST_TOAST_LIST = '[data-test-subj="globalToastList"]';

/* Miscellaneous */

export const UNTITLED_TIMELINE_BUTTON = `[data-test-subj="flyoutOverlay"]`;

export const TIMELINE_DRAGGABLE_ITEM = `[data-test-subj="providerContainer"]`;

export const KQL_FILTER = `[id="popoverFor_filter0"]`;

export const FILTERS_GLOBAL_CONTAINER = `[data-test-subj="filters-global-container"]`;

export const TIME_RANGE_PICKER = `[data-test-subj="superDatePickerToggleQuickMenuButton"]`;

export const QUERY_INPUT = `[data-test-subj="queryInput"]`;

export const EMPTY_STATE = `[data-test-subj="${PANEL_TEST_ID}"]`;

export const INSPECTOR_BUTTON = `[data-test-subj="${INSPECT_BUTTON_TEST_ID}"]`;

export const INSPECTOR_PANEL = `[data-test-subj="inspectorPanel"]`;

export const ADD_INTEGRATIONS_BUTTON = `[data-test-subj="add-data"]`;

export const REFRESH_BUTTON = `[data-test-subj="querySubmitButton"]`;
