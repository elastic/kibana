/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineFilter } from '../objects/timeline';

export const ADD_NOTE_BUTTON = '[data-test-subj="add-note"]';

export const ADD_FILTER = '[data-test-subj="timeline"] [data-test-subj="addFilter"]';

export const ATTACH_TIMELINE_TO_CASE_BUTTON = '[data-test-subj="attach-timeline-case-button"]';

export const ATTACH_TIMELINE_TO_NEW_CASE_ICON = '[data-test-subj="attach-timeline-new-case"]';

export const ATTACH_TIMELINE_TO_EXISTING_CASE_ICON =
  '[data-test-subj="attach-timeline-existing-case"]';

export const BULK_ACTIONS = '[data-test-subj="utility-bar-action-button"]';

export const CASE = (id: string) => {
  return `[data-test-subj="cases-table-row-${id}"]`;
};

export const CLOSE_TIMELINE_BTN = '[data-test-subj="close-timeline"]';

export const COMBO_BOX = '.euiComboBoxOption__content';

export const CREATE_NEW_TIMELINE = '[data-test-subj="timeline-new"]';

export const CREATE_NEW_TIMELINE_TEMPLATE = '[data-test-subj="template-timeline-new"]';

export const DRAGGABLE_HEADER =
  '[data-test-subj="events-viewer-panel"] [data-test-subj="headers-group"] [data-test-subj="draggable-header"]';

export const FAVORITE_TIMELINE = '[data-test-subj="timeline-favorite-filled-star"]';

export const GRAPH_TAB_BUTTON = '[data-test-subj="timelineTabs-graph"]';

export const HEADER = '[data-test-subj="header"]';

export const HEADERS_GROUP =
  '[data-test-subj="events-viewer-panel"] [data-test-subj="headers-group"]';

export const ID_HEADER_FIELD = '[data-test-subj="timeline"] [data-test-subj="header-text-_id"]';

export const ID_FIELD = '[data-test-subj="timeline"] [data-test-subj="field-name-_id"]';

export const ID_TOGGLE_FIELD = '[data-test-subj="toggle-field-_id"]';

export const LOCKED_ICON = '[data-test-subj="timeline-date-picker-lock-button"]';

export const UNLOCKED_ICON = '[data-test-subj="timeline-date-picker-unlock-button"]';

export const NOTES = '[data-test-subj="note-card-body"]';

export const NOTE_BY_NOTE_ID = (noteId: string) =>
  `[data-test-subj="note-preview-${noteId}"] .euiMarkdownFormat`;

export const NOTE_CONTENT = (noteId: string) => `${NOTE_BY_NOTE_ID(noteId)} p`;

export const NOTES_TEXT_AREA = '[data-test-subj="add-a-note"] textarea';

export const NOTES_TAB_BUTTON = '[data-test-subj="timelineTabs-notes"]';

export const NOTES_TEXT = '.euiMarkdownFormat';

export const NOTES_COUNT = '[data-test-subj="timeline-notes-count"]';

export const OPEN_TIMELINE_ICON = '[data-test-subj="open-timeline-button"]';

export const OPEN_TIMELINE_MODAL = '[data-test-subj="open-timeline-modal"]';

export const OPEN_TIMELINE_TEMPLATE_ICON =
  '[data-test-subj="open-timeline-modal-body-filter-template"]';

export const PIN_EVENT = '[data-test-subj="pin"]';

export const PINNED_TAB_BUTTON = '[data-test-subj="timelineTabs-pinned"]';

export const PROVIDER_BADGE = '[data-test-subj="providerBadge"]';

export const REMOVE_COLUMN = '[data-test-subj="remove-column"]';

export const RESET_FIELDS =
  '[data-test-subj="fields-browser-container"] [data-test-subj="reset-fields"]';

export const SAVE_FILTER_BTN = '[data-test-subj="saveFilter"]';

export const SEARCH_OR_FILTER_CONTAINER =
  '[data-test-subj="timeline-search-or-filter-search-container"]';

export const QUERY_TAB_EVENTS_TABLE = '[data-test-subj="query-events-table"]';

export const QUERY_TAB_EVENTS_BODY = '[data-test-subj="query-tab-flyout-body"]';

export const QUERY_TAB_EVENTS_FOOTER = '[data-test-subj="query-tab-flyout-footer"]';

export const PINNED_TAB_EVENTS_TABLE = '[data-test-subj="pinned-events-table"]';

export const PINNED_TAB_EVENTS_BODY = '[data-test-subj="pinned-tab-flyout-body"]';

export const PINNED_TAB_EVENTS_FOOTER = '[data-test-subj="pinned-tab-flyout-footer"]';

export const SERVER_SIDE_EVENT_COUNT = '[data-test-subj="server-side-event-count"]';

export const STAR_ICON = '[data-test-subj="timeline-favorite-empty-star"]';

export const TIMELINE_CHANGES_IN_PROGRESS = '[data-test-subj="timeline"] .euiProgress';

export const TIMELINE_COLUMN_SPINNER = '[data-test-subj="timeline-loading-spinner"]';

export const TIMELINE_DATA_PROVIDERS = '[data-test-subj="dataProviders"]';

export const TIMELINE_DATA_PROVIDERS_ACTION_MENU = '[data-test-subj="providerActions"]';

export const TIMELINE_DATA_PROVIDERS_EMPTY =
  '[data-test-subj="dataProviders"] [data-test-subj="empty"]';

export const TIMELINE_DESCRIPTION = '[data-test-subj="timeline-description"]';

export const TIMELINE_DESCRIPTION_INPUT = '[data-test-subj="save-timeline-description"]';

export const TIMELINE_DROPPED_DATA_PROVIDERS = '[data-test-subj="providerContainer"]';

export const TIMELINE_FIELDS_BUTTON =
  '[data-test-subj="timeline"] [data-test-subj="show-field-browser"]';

export const TIMELINE_FILTER = (filter: TimelineFilter) =>
  `[data-test-subj="filter filter-enabled filter-key-${filter.field} filter-value-${filter.value} filter-unpinned"]`;

export const TIMELINE_FILTER_FIELD = '[data-test-subj="filterFieldSuggestionList"]';

export const TIMELINE_TITLE_BY_ID = (id: string) => `[data-test-subj="title-${id}"]`;

export const TIMELINE_FILTER_OPERATOR = '[data-test-subj="filterOperatorList"]';

export const TIMELINE_FILTER_VALUE =
  '[data-test-subj="filterParamsComboBox phraseParamsComboxBox"]';

export const TIMELINE_FLYOUT = '[data-test-subj="eui-flyout"]';

export const TIMELINE_FLYOUT_HEADER = '[data-test-subj="query-tab-flyout-header"]';

export const TIMELINE_FLYOUT_BODY = '[data-test-subj="query-tab-flyout-body"]';

export const TIMELINE_INSPECT_BUTTON = `${TIMELINE_FLYOUT} [data-test-subj="inspect-icon-button"]`;

export const TIMELINE_QUERY = '[data-test-subj="timelineQueryInput"]';

export const TIMELINE_SETTINGS_ICON = '[data-test-subj="settings-plus-in-circle"]';

export const TIMELINE_TITLE = '[data-test-subj="timeline-title"]';

export const TIMELINE_TITLE_INPUT = '[data-test-subj="save-timeline-title"]';

export const TIMESTAMP_HEADER_FIELD = '[data-test-subj="header-text-@timestamp"]';

export const TIMESTAMP_TOGGLE_FIELD = '[data-test-subj="toggle-field-@timestamp"]';

export const TOGGLE_TIMELINE_EXPAND_EVENT = '[data-test-subj="expand-event"]';

export const TIMELINE_EDIT_MODAL_OPEN_BUTTON = '[data-test-subj="save-timeline-button-icon"]';

export const TIMELINE_EDIT_MODAL_SAVE_BUTTON = '[data-test-subj="save-button"]';

export const QUERY_TAB_BUTTON = '[data-test-subj="timelineTabs-query"]';
