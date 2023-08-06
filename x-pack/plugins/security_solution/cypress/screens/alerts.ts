/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';
import { GLOBAL_FILTERS_CONTAINER } from './date_picker';

export const ADD_EXCEPTION_BTN = '[data-test-subj="add-exception-menu-item"]';

export const ADD_ENDPOINT_EXCEPTION_BTN = '[data-test-subj="add-endpoint-exception-menu-item"]';

export const ALERT_COUNT_TABLE_COLUMN = (column: number) =>
  `[data-test-subj="embeddablePanel"] [data-test-subj="dataGridRowCell"]:nth-child(${column}) [data-test-subj="lnsTableCellContent"]`;

export const ALERT_EMBEDDABLE_PROGRESS_BAR = '[data-test-subj="embeddablePanel"] .euiProgress';

export const ALERT_EMBEDDABLE_EMPTY_PROMPT =
  '[data-test-subj="embeddablePanel"] [data-test-subj="emptyPlaceholder"]';

export const ALERT_CHECKBOX = '[data-test-subj="bulk-actions-row-cell"].euiCheckbox__input';

export const ALERT_GRID_CELL = '[data-test-subj="dataGridRowCell"]';

export const ALERT_RULE_NAME = '[data-test-subj="formatted-field-kibana.alert.rule.name"]';

export const ALERT_RISK_SCORE = '[data-test-subj="formatted-field-kibana.alert.risk_score"]';

export const ALERT_SEVERITY = '[data-test-subj="formatted-field-kibana.alert.severity"]';

export const ALERT_DATA_GRID = '[data-test-subj="euiDataGridBody"]';

export const ALERTS = '[data-test-subj="events-viewer-panel"][data-test-subj="event"]';

export const ALERTS_COUNT = '[data-test-subj="toolbar-alerts-count"]';

export const CLOSE_ALERT_BTN = '[data-test-subj="close-alert-status"]';

export const CLOSE_SELECTED_ALERTS_BTN = '[data-test-subj="closed-alert-status"]';

export const CLOSED_ALERTS_FILTER_BTN = '[data-test-subj="closedAlerts"]';

export const DESTINATION_IP = '[data-test-subj^=formatted-field][data-test-subj$=destination\\.ip]';

export const EMPTY_ALERT_TABLE = '[data-test-subj="alertsStateTableEmptyState"]';

export const EXPAND_ALERT_BTN = '[data-test-subj="expand-event"]';

export const TAKE_ACTION_BTN = '[data-test-subj="take-action-dropdown-btn"]';

export const TAKE_ACTION_MENU = '[data-test-subj="takeActionPanelMenu"]';

export const CLOSE_FLYOUT = '[data-test-subj="euiFlyoutCloseButton"]';

export const GROUP_BY_TOP_INPUT = '[data-test-subj="groupByTop"] [data-test-subj="comboBoxInput"]';

export const HOST_NAME = '[data-test-subj^=formatted-field][data-test-subj$=host\\.name]';

export const ACKNOWLEDGED_ALERTS_FILTER_BTN = '[data-test-subj="acknowledgedAlerts"]';

export const LOADING_ALERTS_PANEL = '[data-test-subj="loading-alerts-panel"]';

export const MANAGE_ALERT_DETECTION_RULES_BTN = '[data-test-subj="manage-alert-detection-rules"]';

export const MARK_ALERT_ACKNOWLEDGED_BTN = '[data-test-subj="acknowledged-alert-status"]';

export const ALERTS_REFRESH_BTN = `${GLOBAL_FILTERS_CONTAINER} [data-test-subj="querySubmitButton"]`;

export const ALERTS_HISTOGRAM_PANEL_LOADER = '[data-test-subj="loadingPanelAlertsHistogram"]';

export const ALERTS_CONTAINER_LOADING_BAR = '[data-test-subj="events-container-loading-true"]';

export const OPEN_ALERT_BTN = '[data-test-subj="open-alert-status"]';

export const OPENED_ALERTS_FILTER_BTN = '[data-test-subj="openAlerts"]';

export const OPEN_ALERT_DETAILS_PAGE_CONTEXT_MENU_BTN =
  '[data-test-subj="open-alert-details-page-menu-item"]';

export const PROCESS_NAME_COLUMN = '[data-test-subj="dataGridHeaderCell-process.name"]';
export const PROCESS_NAME = '[data-test-subj="formatted-field-process.name"]';
export const MESSAGE = '[data-test-subj="formatted-field-message"]';

export const REASON =
  '[data-test-subj="dataGridRowCell"][data-gridcell-column-id="kibana.alert.reason"]';

export const RISK_SCORE = '[data-test-subj^=formatted-field][data-test-subj$=risk_score]';

export const RULE_NAME = '[data-test-subj^=formatted-field][data-test-subj$=rule\\.name]';

export const SELECTED_ALERTS = '[data-test-subj="selectedShowBulkActionsButton"]';

export const SELECT_AGGREGATION_CHART = '[data-test-subj="chart-select-table"]';

export const SEND_ALERT_TO_TIMELINE_BTN = '[data-test-subj="send-alert-to-timeline-button"]';

export const OPEN_ANALYZER_BTN = '[data-test-subj="view-in-analyzer"]';

export const ANALYZER_NODE = '[data-test-subj="resolver:node"';

export const SEVERITY = '[data-test-subj^=formatted-field][data-test-subj$=severity]';

export const SOURCE_IP = '[data-test-subj^=formatted-field][data-test-subj$=source\\.ip]';

export const TAKE_ACTION_POPOVER_BTN = '[data-test-subj="selectedShowBulkActionsButton"]';

export const TIMELINE_CONTEXT_MENU_BTN = '[data-test-subj="timeline-context-menu-button"]';

export const TIMELINE_CONTEXT_MENU = '[data-test-subj="actions-context-menu"]';

export const USER_NAME = '[data-test-subj^=formatted-field][data-test-subj$=user\\.name]';

export const ATTACH_ALERT_TO_CASE_BUTTON = '[data-test-subj="add-to-existing-case-action"]';

export const ATTACH_TO_NEW_CASE_BUTTON = '[data-test-subj="add-to-new-case-action"]';

export const USER_COLUMN = '[data-gridcell-column-id="user.name"]';

export const HOST_RISK_HEADER_COLIMN =
  '[data-test-subj="dataGridHeaderCell-host.risk.calculated_level"]';

export const HOST_RISK_COLUMN = '[data-gridcell-column-id="host.risk.calculated_level"]';

export const USER_RISK_HEADER_COLIMN =
  '[data-test-subj="dataGridHeaderCell-user.risk.calculated_level"]';

export const USER_RISK_COLUMN = '[data-gridcell-column-id="user.risk.calculated_level"]';

export const ACTION_COLUMN = '[data-gridcell-column-id="expandColumn"]';

export const DATAGRID_CHANGES_IN_PROGRESS = '[data-test-subj="body-data-grid"] .euiProgress';

export const EVENT_CONTAINER_TABLE_LOADING = '[data-test-subj="internalAlertsPageLoading"]';

export const SELECT_ALL_VISIBLE_ALERTS = '[data-test-subj="bulk-actions-header"]';

export const SELECT_ALL_ALERTS = '[data-test-subj="selectAllAlertsButton"]';

export const EVENT_CONTAINER_TABLE_NOT_LOADING =
  '[data-test-subj="events-container-loading-false"]';

export const FILTER_BADGE = '[data-test-subj^="filter-badge"]';

export const FILTER_BADGE_DELETE = '[data-test-subj="deleteFilter"]';

export const CELL_FILTER_IN_BUTTON =
  '[data-test-subj="dataGridColumnCellAction-security-default-cellActions-filterIn"]';
export const CELL_FILTER_OUT_BUTTON =
  '[data-test-subj="dataGridColumnCellAction-security-default-cellActions-filterOut"]';
export const CELL_ADD_TO_TIMELINE_BUTTON =
  '[data-test-subj="dataGridColumnCellAction-security-default-cellActions-addToTimeline"]';
export const CELL_SHOW_TOP_FIELD_BUTTON =
  '[data-test-subj="dataGridColumnCellAction-security-default-cellActions-showTopN"]';
export const CELL_COPY_BUTTON =
  '[data-test-subj="dataGridColumnCellAction-security-default-cellActions-copyToClipboard"]';

export const ACTIONS_EXPAND_BUTTON = '[data-test-subj="euiDataGridCellExpandButton"]';

export const SHOW_TOP_N_HEADER =
  '[data-test-subj="topN-container"] [data-test-subj="header-section-title"]';

export const SHOW_TOP_N_CLOSE_BUTTON = '[data-test-subj="close"]';

export const ALERTS_HISTOGRAM_LEGEND =
  '[data-test-subj="alerts-histogram-panel"] .echLegendItem__action';

export const ALERTS_HISTOGRAM_SERIES = '[data-ech-series-name]';

export const SELECT_HISTOGRAM = '[data-test-subj="chart-select-trend"]';

export const LEGEND_ACTIONS = {
  ADD_TO_TIMELINE: (ruleName: string) =>
    `[data-test-subj="legend-${ruleName}-embeddable_addToTimeline"]`,
  FILTER_FOR: (ruleName: string) => `[data-test-subj="legend-${ruleName}-filterIn"]`,
  FILTER_OUT: (ruleName: string) => `[data-test-subj="legend-${ruleName}-filterOut"]`,
  COPY: (ruleName: string) => `[data-test-subj="legend-${ruleName}-embeddable_copyToClipboard"]`,
};

export const TREND_CHART_LEGEND = '[data-test-subj="draggable-legend"]';

export const SESSION_VIEWER_BUTTON = '[data-test-subj="session-view-button"]';

export const OVERLAY_CONTAINER = '[data-test-subj="overlayContainer"]';

export const CLOSE_OVERLAY = '[data-test-subj="close-overlay"]';

export const ALERT_SUMMARY_SEVERITY_DONUT_CHART =
  getDataTestSubjectSelector('severity-level-donut');

export const ALERT_TAGGING_CONTEXT_MENU_ITEM = '[data-test-subj="alert-tags-context-menu-item"]';

export const ALERT_TAGGING_CONTEXT_MENU = '[data-test-subj="alert-tags-selectable-menu"]';

export const ALERT_TAGGING_UPDATE_BUTTON = '[data-test-subj="alert-tags-update-button"]';

export const SELECTED_ALERT_TAG = '[data-test-subj="selected-alert-tag"]';

export const MIXED_ALERT_TAG = '[data-test-subj="mixed-alert-tag"]';

export const UNSELECTED_ALERT_TAG = '[data-test-subj="unselected-alert-tag"]';

export const ALERTS_TABLE_ROW_LOADER = '[data-test-subj="row-loader"]';

export const ALERT_TABLE_SUMMARY_VIEW_SELECTABLE = '[data-test-subj="summary-view-selector"]';

export const ALERT_TABLE_GRID_VIEW_OPTION = '[data-test-subj="gridView"]';

export const EVENT_SUMMARY_COLUMN = '[data-gridcell-column-id="eventSummary"]';

export const EVENT_SUMMARY_ALERT_RENDERER_CONTENT = '[data-test-subj="alertRenderer"]';

export const ALERT_TABLE_EVENT_RENDERED_VIEW_OPTION = '[data-test-subj="eventRenderedView"]';

export const ALERT_TABLE_ADDITIONAL_CONTROLS = '[data-test-subj="additionalFilters-popover"]';

export const ALERT_RENDERER_CONTENT = '[data-test-subj="alertRenderer"]';

export const ALERT_RENDERER_HOST_NAME =
  '[data-test-subj="alertFieldBadge"] [data-test-subj="render-content-host.name"]';

export const HOVER_ACTIONS_CONTAINER = getDataTestSubjectSelector('hover-actions-container');
