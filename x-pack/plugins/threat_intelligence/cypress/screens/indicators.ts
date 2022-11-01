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

export const INDICATORS_TABLE_TIMESTAMP_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-@timestamp"]`;

export const INDICATORS_TABLE_INDICATOR_NAME_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.name"]`;

export const INDICATORS_TABLE_INDICATOR_TYPE_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.type"]`;

export const INDICATORS_TABLE_FEED_NAME_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.feed.name"]`;

export const INDICATORS_TABLE_FIRST_SEEN_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.first_seen"]`;

export const INDICATORS_TABLE_LAST_SEEN_COLUMN_HEADER = `[data-test-subj="dataGridHeaderCell-threat.indicator.last_seen"]`;

export const TABLE_CONTROLS = '[data-test-sub="dataGridControls"]';

export const INDICATOR_TYPE_CELL = '[data-gridcell-column-id="threat.indicator.type"]';

export const INDICATORS_TABLE_CELL_TIMELINE_BUTTON =
  '[data-test-subj="tiIndicatorsTableCellTimelineButton"]';

export const INDICATORS_TABLE_CELL_FILTER_IN_BUTTON =
  '[data-test-subj="tiIndicatorsTableCellFilterInButton"]';

export const INDICATORS_TABLE_CELL_FILTER_OUT_BUTTON =
  '[data-test-subj="tiIndicatorsTableCellFilterOutButton"]';

export const INDICATORS_TABLE_INVESTIGATE_IN_TIMELINE_BUTTON_ICON =
  '[data-test-subj="tiIndicatorTableInvestigateInTimelineButtonIcon"]';

export const INDICATOR_FLYOUT_INVESTIGATE_IN_TIMELINE_BUTTON =
  '[data-test-subj="tiIndicatorFlyoutInvestigateInTimelineButton"]';

/* Flyout */

export const TOGGLE_FLYOUT_BUTTON = `[data-test-subj="tiToggleIndicatorFlyoutButton"]`;

export const FLYOUT_CLOSE_BUTTON = `[data-test-subj="euiFlyoutCloseButton"]`;

export const FLYOUT_TITLE = `[data-test-subj="tiIndicatorFlyoutTitle"]`;

export const FLYOUT_TABS = `[data-test-subj="tiIndicatorFlyoutTabs"]`;

export const FLYOUT_TABLE = `[data-test-subj="tiFlyoutTableTabRow"]`;

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

export const FLYOUT_TABLE_TAB_ROW_TIMELINE_BUTTON =
  '[data-test-subj="tiFlyoutTableTabRowTimelineButton"]';

export const FLYOUT_TABLE_TAB_ROW_FILTER_IN_BUTTON =
  '[data-test-subj="tiFlyoutTableTabRowFilterInButton"]';

export const FLYOUT_TABLE_TAB_ROW_FILTER_OUT_BUTTON =
  '[data-test-subj="tiFlyoutTableTabRowFilterOutButton"]';

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
