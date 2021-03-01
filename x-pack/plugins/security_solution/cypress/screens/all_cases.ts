/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALL_CASES_CASE = (id: string) => {
  return `[data-test-subj="cases-table-row-${id}"]`;
};

export const ALL_CASES_CLOSED_CASES_STATS = '[data-test-subj="closedStatsHeader"]';

export const ALL_CASES_COMMENTS_COUNT = '[data-test-subj="case-table-column-commentCount"]';

export const ALL_CASES_CREATE_NEW_CASE_BTN = '[data-test-subj="createNewCaseBtn"]';

export const ALL_CASES_CREATE_NEW_CASE_TABLE_BTN = '[data-test-subj="cases-table-add-case"]';

export const ALL_CASES_IN_PROGRESS_CASES_STATS = '[data-test-subj="inProgressStatsHeader"]';

export const ALL_CASES_ITEM_ACTIONS_BTN = '[data-test-subj="euiCollapsedItemActionsButton"]';

export const ALL_CASES_NAME = '[data-test-subj="case-details-link"]';

export const ALL_CASES_OPEN_CASES_COUNT = '[data-test-subj="case-status-filter"]';

export const ALL_CASES_OPEN_CASES_STATS = '[data-test-subj="openStatsHeader"]';

export const ALL_CASES_OPENED_ON = '[data-test-subj="case-table-column-createdAt"]';

export const ALL_CASES_PAGE_TITLE = '[data-test-subj="header-page-title"]';

export const ALL_CASES_REPORTER = '[data-test-subj="case-table-column-createdBy"]';

export const ALL_CASES_REPORTERS_COUNT =
  '[data-test-subj="options-filter-popover-button-Reporter"]';

export const ALL_CASES_SERVICE_NOW_INCIDENT =
  '[data-test-subj="case-table-column-external-notPushed"]';

export const ALL_CASES_TAGS = (index: number) => {
  return `[data-test-subj="case-table-column-tags-${index}"]`;
};

export const ALL_CASES_TAGS_COUNT = '[data-test-subj="options-filter-popover-button-Tags"]';

export const EDIT_EXTERNAL_CONNECTION = '[data-test-subj="configure-case-button"]';
