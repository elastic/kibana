/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Breadcrumbs */

export const BREADCRUMBS = '[data-test-subj="breadcrumbs"]';

export const LEADING_BREADCRUMB = '[data-test-subj="breadcrumb first"]';

export const ENDING_BREADCRUMB = '[data-test-subj="breadcrumb last"]';

/* Titles */

export const DEFAULT_LAYOUT_TITLE = `[data-test-subj="tiDefaultPageLayoutTitle"]`;

/* Indicators Table */

export const INDICATORS_TABLE = `[data-test-subj="tiIndicatorsTable"]`;

export const INDICATORS_TABLE_ROW_CELL = `[data-test-subj="dataGridRowCell"]`;

export const INDICATORS_TABLE_INDICATOR_NAME_CELL = `[data-gridcell-column-id="threat.indicator.name"]`;

export const INDICATORS_TABLE_INDICATOR_TYPE_CELL = `[data-gridcell-column-id="threat.indicator.type"]`;

export const INDICATORS_TABLE_INDICATOR_NAME_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.name"]`;

export const INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.type"]`;

export const INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.feed.name"]`;

export const INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.first_seen"]`;

export const INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.last_seen"]`;

export const TABLE_CONTROLS = '[data-test-subj="dataGridControls"]';

export const INDICATOR_TYPE_CELL =
  '[role="gridcell"][data-gridcell-column-id="threat.indicator.type"]';

export const INDICATORS_TABLE_CELL_TIMELINE_BUTTON =
  '[data-test-subj="tiIndicatorsTableCellTimelineButton"] button';

export const INDICATORS_TABLE_CELL_FILTER_IN_BUTTON =
  '[data-test-subj="tiIndicatorsTableCellFilterInButton"] button';

export const INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON =
  '[data-test-subj="tiIndicatorsTableCellFilterOutButton"] button';

export const INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON =
  '[data-test-subj="tiIndicatorTableInvestigateInTimelineButtonIcon"]';

export const INDICATORS_TABLE_MORE_ACTION_BUTTON_ICON =
  '[data-test-subj="tiIndicatorTableMoreActionsButton"]';

export const INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON =
  '[data-test-subj="tiIndicatorTableAddToNewCaseContextMenu"]';

export const INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON =
  '[data-test-subj="tiIndicatorTableAddToExistingCaseContextMenu"]';

/* Flyout */

export const TOGGLE_FLYOUT_BUTTON = `[data-test-subj="tiToggleIndicatorFlyoutButton"]`;

export const FLYOUT_CLOSE_BUTTON = `[data-test-subj="euiFlyoutCloseButton"]`;

export const FLYOUT_TITLE = `[data-test-subj="tiIndicatorFlyoutTitle"]`;

export const FLYOUT_TABS = `[data-test-subj="tiIndicatorFlyoutTabs"]`;

export const FLYOUT_TABLE = `[data-test-subj="tiFlyoutTable"]`;

export const FLYOUT_JSON = `[data-test-subj="tiFlyoutJsonCodeBlock"]`;

export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_TIMELINE_BUTTON =
  '[data-test-subj="tiFlyoutOverviewTableRowTimelineButton"]';

export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_IN_BUTTON =
  '[data-test-subj="tiFlyoutOverviewTableRowFilterInButton"]';

export const FLYOUT_OVERVIEW_TAB_TABLE_ROW_FILTER_OUT_BUTTON =
  '[data-test-subj="tiFlyoutOverviewTableRowFilterOutButton"]';

export const FLYOUT_OVERVIEW_TAB_BLOCKS_ITEM =
  '[data-test-subj="tiFlyoutOverviewHighLevelBlocksItem"]';

export const FLYOUT_OVERVIEW_TAB_BLOCKS_TIMELINE_BUTTON =
  '[data-test-subj="tiFlyoutOverviewHighLevelBlocksTimelineButton"]';

export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_IN_BUTTON =
  '[data-test-subj="tiFlyoutOverviewHighLevelBlocksFilterInButton"]';

export const FLYOUT_OVERVIEW_TAB_BLOCKS_FILTER_OUT_BUTTON =
  '[data-test-subj="tiFlyoutOverviewHighLevelBlocksFilterOutButton"]';

export const FLYOUT_TABLE_MORE_ACTIONS_BUTTON =
  '[data-test-subj="tiFlyoutOverviewTableRowPopoverButton"] button';

export const FLYOUT_BLOCK_MORE_ACTIONS_BUTTON =
  '[data-test-subj="tiFlyoutOverviewHighLevelBlocksPopoverButton"] button';

export const FLYOUT_TABLE_TAB_ROW_TIMELINE_BUTTON =
  '[data-test-subj="tiFlyoutTableTimelineButton"]';

export const FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON =
  '[data-test-subj="tiFlyoutTableFilterInButton"]';

export const FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON =
  '[data-test-subj="tiFlyoutTableFilterOutButton"]';

export const FLYOUT_TAKE_ACTION_BUTTON = '[data-test-subj="tiIndicatorFlyoutTakeActionButton"]';

export const FLYOUT_ADD_TO_EXISTING_CASE_ITEM =
  '[data-test-subj="tiIndicatorFlyoutAddToExistingCaseContextMenu"]';

export const FLYOUT_ADD_TO_NEW_CASE_ITEM =
  '[data-test-subj="tiIndicatorFlyoutAddToNewCaseContextMenu"]';

export const FLYOUT_INVESTIGATE_IN_TIMELINE_ITEM =
  '[data-test-subj="tiIndicatorFlyoutInvestigateInTimelineContextMenu"]';

/* Field selector */

export const FIELD_SELECTOR = '[data-test-subj="tiIndicatorFieldSelectorDropdown"]';

export const FIELD_SELECTOR_INPUT = '[data-test-subj="comboBoxInput"]';

export const FIELD_SELECTOR_TOGGLE_BUTTON = '[data-test-subj="comboBoxToggleListButton"]';

export const FIELD_SELECTOR_LIST =
  '[data-test-subj="comboBoxOptionsList tiIndicatorFieldSelectorDropdown-optionsList"]';

/* Field browser */

export const FIELD_BROWSER = `[data-test-subj="show-field-browser"]`;

export const FIELD_BROWSER_MODAL = `[data-test-subj="fields-browser-container"]`;

/* Barchart */

export const BARCHART_POPOVER_BUTTON = '[data-test-subj="tiBarchartPopoverButton"]';

export const BARCHART_TIMELINE_BUTTON = '[data-test-subj="tiBarchartTimelineButton"]';

export const BARCHART_FILTER_IN_BUTTON = '[data-test-subj="tiBarchartFilterInButton"]';

export const BARCHART_FILTER_OUT_BUTTON = '[data-test-subj="tiBarchartFilterOutButton"]';

/* Cases */

export const CREAT_CASE_BUTTON = '[data-test-subj="createNewCaseBtn"]';

export const SELECT_EXISTING_CASE = '[class="eui-textTruncate"]';

export const VIEW_CASE_TOASTER_LINK = '[data-test-subj="toaster-content-case-view-link"]';

export const CASE_COMMENT_EXTERNAL_REFERENCE =
  '[data-test-subj="comment-externalReference-indicator"]';

export const CASE_ACTION_WRAPPER = '[data-test-subj="case-action-bar-wrapper"]';

export const CASE_ELLIPSE_BUTTON = '[data-test-subj="property-actions-ellipses"]';

export const CASE_ELLIPSE_DELETE_CASE_OPTION = '[data-test-subj="property-actions-trash"]';

export const CASE_ELLIPSE_DELETE_CASE_CONFIRMATION_BUTTON =
  '[data-test-subj="confirmModalConfirmButton"]';

export const NEW_CASE_NAME_INPUT = '[data-test-subj="input"][aria-describedby="caseTitle"]';

export const NEW_CASE_DESCRIPTION_INPUT = '[data-test-subj="euiMarkdownEditorTextArea"]';

export const NEW_CASE_CREATE_BUTTON = '[data-test-subj="create-case-submit"]';

/* Miscellaneous */

export const UNTITLED_TIMELINE_BUTTON = '[data-test-subj="flyoutOverlay"]';

export const TIMELINE_DRAGGABLE_ITEM = '[data-test-subj="providerContainer"]';

export const KQL_FILTER = '[id="popoverFor_filter0"]';

export const FILTERS_GLOBAL_CONTAINER = '[data-test-subj="filters-global-container"]';

export const TIME_RANGE_PICKER = `[data-test-subj="superDatePickerToggleQuickMenuButton"]`;

export const QUERY_INPUT = `[data-test-subj="queryInput"]`;

export const EMPTY_STATE = '[data-test-subj="indicatorsTableEmptyState"]';

export const INSPECTOR_BUTTON = '[data-test-subj="tiIndicatorsGridInspect"]';

export const INSPECTOR_PANEL = '[data-test-subj="inspectorPanel"]';

export const ADD_INTEGRATIONS_BUTTON = '[data-test-subj="add-data"]';

export const REFRESH_BUTTON = '[data-test-subj="querySubmitButton"]';
