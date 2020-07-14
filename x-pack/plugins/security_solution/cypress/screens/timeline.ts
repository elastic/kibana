/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const CLOSE_TIMELINE_BTN = '[data-test-subj="close-timeline"]';

export const CREATE_NEW_TIMELINE = '[data-test-subj="timeline-new"]';

export const DRAGGABLE_HEADER =
  '[data-test-subj="events-viewer-panel"] [data-test-subj="headers-group"] [data-test-subj="draggable-header"]';

export const HEADERS_GROUP = '[data-test-subj="headers-group"]';

export const ID_HEADER_FIELD = '[data-test-subj="timeline"] [data-test-subj="header-text-_id"]';

export const ID_FIELD = '[data-test-subj="timeline"] [data-test-subj="field-name-_id"]';

export const ID_TOGGLE_FIELD = '[data-test-subj="toggle-field-_id"]';

export const PROVIDER_BADGE = '[data-test-subj="providerBadge"]';

export const REMOVE_COLUMN =
  '[data-test-subj="events-viewer-panel"] [data-test-subj="remove-column"]';

export const RESET_FIELDS =
  '[data-test-subj="events-viewer-panel"] [data-test-subj="reset-fields"]';

export const SEARCH_OR_FILTER_CONTAINER =
  '[data-test-subj="timeline-search-or-filter-search-container"]';

export const SERVER_SIDE_EVENT_COUNT = '[data-test-subj="server-side-event-count"]';

export const TIMELINE = (id: string) => {
  return `[data-test-subj="title-${id}"]`;
};

export const TIMELINE_COLUMN_SPINNER = '[data-test-subj="timeline-loading-spinner"]';

export const TIMELINE_DATA_PROVIDERS = '[data-test-subj="dataProviders"]';

export const TIMELINE_DATA_PROVIDERS_EMPTY =
  '[data-test-subj="dataProviders"] [data-test-subj="empty"]';

export const TIMELINE_DESCRIPTION = '[data-test-subj="timeline-description"]';

export const TIMELINE_DROPPED_DATA_PROVIDERS = '[data-test-subj="providerContainer"]';

export const TIMELINE_FIELDS_BUTTON =
  '[data-test-subj="timeline"] [data-test-subj="show-field-browser"]';

export const TIMELINE_FLYOUT_HEADER = '[data-test-subj="eui-flyout-header"]';

export const TIMELINE_FLYOUT_BODY = '[data-test-subj="eui-flyout-body"]';

export const TIMELINE_INSPECT_BUTTON = '[data-test-subj="inspect-empty-button"]';

export const TIMELINE_NOT_READY_TO_DROP_BUTTON =
  '[data-test-subj="flyout-button-not-ready-to-drop"]';

export const TIMELINE_QUERY = '[data-test-subj="timelineQueryInput"]';

export const TIMELINE_SETTINGS_ICON = '[data-test-subj="settings-gear"]';

export const TIMELINE_TITLE = '[data-test-subj="timeline-title"]';

export const TIMESTAMP_HEADER_FIELD = '[data-test-subj="header-text-@timestamp"]';

export const TIMESTAMP_TOGGLE_FIELD = '[data-test-subj="toggle-field-@timestamp"]';

export const TOGGLE_TIMELINE_EXPAND_EVENT = '[data-test-subj="expand-event"]';
