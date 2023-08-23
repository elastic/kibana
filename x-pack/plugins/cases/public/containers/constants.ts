/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleCaseMetricsFeature } from './types';

export const DEFAULT_TABLE_ACTIVE_PAGE = 1;
export const DEFAULT_TABLE_LIMIT = 10;

export const casesQueriesKeys = {
  all: ['cases'] as const,
  users: ['users'] as const,
  connectors: ['connectors'] as const,
  alerts: ['alerts'] as const,
  userActions: ['user-actions'] as const,
  connectorsList: () => [...casesQueriesKeys.connectors, 'list'] as const,
  casesList: () => [...casesQueriesKeys.all, 'list'] as const,
  casesMetrics: () => [...casesQueriesKeys.casesList(), 'metrics'] as const,
  casesStatuses: () => [...casesQueriesKeys.casesList(), 'statuses'] as const,
  cases: (params: unknown) => [...casesQueriesKeys.casesList(), 'all-cases', params] as const,
  caseView: () => [...casesQueriesKeys.all, 'case'] as const,
  case: (id: string) => [...casesQueriesKeys.caseView(), id] as const,
  caseFiles: (id: string, params: unknown) =>
    [...casesQueriesKeys.case(id), 'files', params] as const,
  caseFileStats: (id: string) => [...casesQueriesKeys.case(id), 'files', 'stats'] as const,
  caseMetrics: (id: string, features: SingleCaseMetricsFeature[]) =>
    [...casesQueriesKeys.case(id), 'metrics', features] as const,
  caseConnectors: (id: string) => [...casesQueriesKeys.case(id), 'connectors'],
  caseUsers: (id: string) => [...casesQueriesKeys.case(id), 'users'],
  caseUserActions: (id: string, params: unknown) =>
    [...casesQueriesKeys.case(id), ...casesQueriesKeys.userActions, params] as const,
  caseUserActionsStats: (id: string) => [
    ...casesQueriesKeys.case(id),
    ...casesQueriesKeys.userActions,
    'stats',
  ],
  userProfiles: () => [...casesQueriesKeys.users, 'user-profiles'] as const,
  userProfilesList: (ids: string[]) => [...casesQueriesKeys.userProfiles(), ids] as const,
  currentUser: () => [...casesQueriesKeys.users, 'current-user'] as const,
  suggestUsers: (params: unknown) => [...casesQueriesKeys.users, 'suggest', params] as const,
  connectorTypes: () => [...casesQueriesKeys.connectors, 'types'] as const,
  license: () => [...casesQueriesKeys.connectors, 'license'] as const,
  tags: () => [...casesQueriesKeys.all, 'tags'] as const,
  categories: () => [...casesQueriesKeys.all, 'categories'] as const,
  alertFeatureIds: (alertRegistrationContexts: string[]) =>
    [...casesQueriesKeys.alerts, 'features', alertRegistrationContexts] as const,
};

export const casesMutationsKeys = {
  createCase: ['create-case'] as const,
  deleteCases: ['delete-cases'] as const,
  updateCase: ['update-case'] as const,
  updateCases: ['update-cases'] as const,
  pushCase: ['push-case'] as const,
  updateComment: ['update-comment'] as const,
  deleteComment: ['delete-comment'] as const,
  deleteFileAttachment: ['delete-file-attachment'] as const,
  bulkCreateAttachments: ['bulk-create-attachments'] as const,
};
