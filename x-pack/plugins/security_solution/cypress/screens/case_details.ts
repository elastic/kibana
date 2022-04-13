/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASE_ACTIONS = '[data-test-subj="property-actions-ellipses"]';

export const CASE_CONNECTOR = '[data-test-subj="connector-fields"] .euiCard__title';

export const CASE_DELETE = '[data-test-subj="property-actions-trash"]';

export const CASE_DETAILS_DESCRIPTION =
  '[data-test-subj="description-action"] [data-test-subj="user-action-markdown"]';

export const CASE_DETAILS_PAGE_TITLE = '[data-test-subj="header-page-title"]';

export const CASE_DETAILS_STATUS = '[data-test-subj="case-view-status-dropdown"]';

export const CASE_DETAILS_TAGS = '[data-test-subj="case-tags"]';

export const CASE_DETAILS_TIMELINE_LINK_MARKDOWN =
  '[data-test-subj="description-action"] [data-test-subj="user-action-markdown"] button';

export const CASE_DETAILS_USER_ACTION_DESCRIPTION_EVENT =
  '[data-test-subj="description-action"] .euiCommentEvent__headerEvent';

export const CASE_DETAILS_USER_ACTION_DESCRIPTION_USERNAME =
  '[data-test-subj="description-action"] .euiCommentEvent__headerUsername';

export const CASE_DETAILS_USERNAMES = '[data-test-subj="case-view-username"]';

export const CASE_EVENT_UPDATE = '.euiCommentEvent--update';

export const CASE_IN_PROGRESS_STATUS = '[data-test-subj="status-badge-in-progress"]';

export const CASE_SWITCH = '[data-test-subj="sync-alerts-switch"]';

export const CASES_TAGS = (tagName: string) => {
  return `[data-test-subj="tag-${tagName}"]`;
};

export const CASE_USER_ACTION = '[data-test-subj="user-action-markdown"]';

export const CONNECTOR_CARD_DETAILS = '[data-test-subj="connector-card"]';

export const CONNECTOR_TITLE = '[data-test-subj="connector-card"] span.euiTitle';

export const DELETE_CASE_CONFIRM_BUTTON = '[data-test-subj="confirmModalConfirmButton"]';

export const PARTICIPANTS = 1;

export const REPORTER = 0;

export const EXPECTED_METRICS = ['alerts.count', 'alerts.users', 'alerts.hosts', 'connectors'];
export const UNEXPECTED_METRICS = ['actions.isolateHost'];

export const CASES_METRIC = (metric: string) => {
  return `[data-test-subj="case-metrics-totals-${metric}"]`;
};
