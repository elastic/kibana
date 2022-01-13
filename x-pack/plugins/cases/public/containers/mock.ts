/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionLicense, AllCases, Case, CasesStatus, CaseUserActions, Comment } from './types';

import type { ResolvedCase, CaseMetrics, CaseMetricsFeature } from '../../common/ui/types';
import {
  Actions,
  ActionTypes,
  CaseConnector,
  CaseResponse,
  CasesFindResponse,
  CasesResponse,
  CasesStatusResponse,
  CaseStatuses,
  CaseUserActionResponse,
  CaseUserActionsResponse,
  CommentResponse,
  CommentType,
  ConnectorTypes,
  UserAction,
  UserActionTypes,
  UserActionWithResponse,
  CommentUserAction,
} from '../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { UseGetCasesState, DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './use_get_cases';
import { SnakeToCamelCase } from '../../common/types';
export { connectorsMock } from './configure/mock';

export const basicCaseId = 'basic-case-id';
export const basicSubCaseId = 'basic-sub-case-id';
const basicCommentId = 'basic-comment-id';
const basicCreatedAt = '2020-02-19T23:06:33.798Z';
const basicUpdatedAt = '2020-02-20T15:02:57.995Z';
const basicClosedAt = '2020-02-21T15:02:57.995Z';
const laterTime = '2020-02-28T15:02:57.995Z';

export const elasticUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const tags: string[] = ['coke', 'pepsi'];

export const basicComment: Comment = {
  comment: 'Solve this fast!',
  type: CommentType.user,
  id: basicCommentId,
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  owner: SECURITY_SOLUTION_OWNER,
  pushedAt: null,
  pushedBy: null,
  updatedAt: null,
  updatedBy: null,
  version: 'WzQ3LDFc',
};

export const alertComment: Comment = {
  alertId: 'alert-id-1',
  index: 'alert-index-1',
  type: CommentType.alert,
  id: 'alert-comment-id',
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  owner: SECURITY_SOLUTION_OWNER,
  pushedAt: null,
  pushedBy: null,
  rule: {
    id: 'rule-id-1',
    name: 'Awesome rule',
  },
  updatedAt: null,
  updatedBy: null,
  version: 'WzQ3LDFc',
};

export const hostIsolationComment: () => Comment = () => {
  return {
    type: CommentType.actions,
    comment: 'I just isolated the host!',
    id: 'isolate-comment-id',
    actions: {
      targets: [
        {
          hostname: 'host1',
          endpointId: '001',
        },
      ],
      type: 'isolate',
    },
    createdAt: basicCreatedAt,
    createdBy: elasticUser,
    owner: SECURITY_SOLUTION_OWNER,
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: 'WzQ3LDFc',
  };
};

export const hostReleaseComment: () => Comment = () => {
  return {
    type: CommentType.actions,
    comment: 'I just released the host!',
    id: 'isolate-comment-id',
    actions: {
      targets: [
        {
          hostname: 'host1',
          endpointId: '001',
        },
      ],
      type: 'unisolate',
    },
    createdAt: basicCreatedAt,
    createdBy: elasticUser,
    owner: SECURITY_SOLUTION_OWNER,
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: 'WzQ3LDFc',
  };
};

export const basicCase: Case = {
  owner: SECURITY_SOLUTION_OWNER,
  closedAt: null,
  closedBy: null,
  id: basicCaseId,
  comments: [basicComment],
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  connector: {
    id: 'none',
    name: 'My Connector',
    type: ConnectorTypes.none,
    fields: null,
  },
  description: 'Security banana Issue',
  externalService: null,
  status: CaseStatuses.open,
  tags,
  title: 'Another horrible breach!!',
  totalComment: 1,
  totalAlerts: 0,
  updatedAt: basicUpdatedAt,
  updatedBy: elasticUser,
  version: 'WzQ3LDFd',
  settings: {
    syncAlerts: true,
  },
  subCaseIds: [],
};

export const basicResolvedCase: ResolvedCase = {
  case: basicCase,
  outcome: 'aliasMatch',
  aliasTargetId: `${basicCase.id}_2`,
};

export const basicCaseMetricsFeatures: CaseMetricsFeature[] = [
  'alerts.count',
  'alerts.users',
  'alerts.hosts',
  'actions.isolateHost',
  'connectors',
];

export const basicCaseMetrics: CaseMetrics = {
  alerts: {
    count: 12,
    hosts: {
      total: 2,
      values: [
        { name: 'foo', count: 2, id: 'foo' },
        { name: 'bar', count: 10, id: 'bar' },
      ],
    },
    users: {
      total: 1,
      values: [{ name: 'Jon', count: 12 }],
    },
  },
  actions: {
    isolateHost: {
      isolate: { total: 5 },
      unisolate: { total: 3 },
    },
  },
  connectors: { total: 1 },
  lifespan: {
    creationDate: basicCreatedAt,
    closeDate: basicClosedAt,
    statusInfo: {
      inProgressDuration: 20,
      openDuration: 10,
      numberOfReopens: 1,
    },
  },
};

export const collectionCase: Case = {
  owner: SECURITY_SOLUTION_OWNER,
  closedAt: null,
  closedBy: null,
  id: 'collection-id',
  comments: [basicComment],
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  connector: {
    id: 'none',
    name: 'My Connector',
    type: ConnectorTypes.none,
    fields: null,
  },
  description: 'Security banana Issue',
  externalService: null,
  status: CaseStatuses.open,
  tags,
  title: 'Another horrible breach in a collection!!',
  totalComment: 1,
  totalAlerts: 0,
  updatedAt: basicUpdatedAt,
  updatedBy: elasticUser,
  version: 'WzQ3LDFd',
  settings: {
    syncAlerts: true,
  },
  subCases: [],
  subCaseIds: [],
};

export const basicCasePost: Case = {
  ...basicCase,
  updatedAt: null,
  updatedBy: null,
};

export const basicCommentPatch: Comment = {
  ...basicComment,
  updatedAt: basicUpdatedAt,
  updatedBy: {
    username: 'elastic',
  },
};

export const basicCaseCommentPatch = {
  ...basicCase,
  comments: [basicCommentPatch],
};

export const casesStatus: CasesStatus = {
  countOpenCases: 20,
  countInProgressCases: 40,
  countClosedCases: 130,
};

export const basicPush = {
  connectorId: '123',
  connectorName: 'connector name',
  externalId: 'external_id',
  externalTitle: 'external title',
  externalUrl: 'basicPush.com',
  pushedAt: basicUpdatedAt,
  pushedBy: elasticUser,
};

export const pushedCase: Case = {
  ...basicCase,
  connector: {
    id: '123',
    name: 'My Connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  externalService: basicPush,
};

const basicAction = {
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  caseId: basicCaseId,
  commentId: null,
  owner: SECURITY_SOLUTION_OWNER,
  payload: { title: 'a title' },
  type: 'title',
};

export const cases: Case[] = [
  basicCase,
  { ...pushedCase, id: '1', totalComment: 0, comments: [] },
  { ...pushedCase, updatedAt: laterTime, id: '2', totalComment: 0, comments: [] },
  { ...basicCase, id: '3', totalComment: 0, comments: [] },
  { ...basicCase, id: '4', totalComment: 0, comments: [] },
];

export const allCases: AllCases = {
  cases,
  page: 1,
  perPage: 5,
  total: 10,
  ...casesStatus,
};

export const actionLicenses: ActionLicense[] = [
  {
    id: '.servicenow',
    name: 'ServiceNow',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
  },
  {
    id: '.jira',
    name: 'Jira',
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
  },
];

// Snake case for mock api responses
export const elasticUserSnake = {
  full_name: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const basicCommentSnake: CommentResponse = {
  comment: 'Solve this fast!',
  type: CommentType.user,
  id: basicCommentId,
  created_at: basicCreatedAt,
  created_by: elasticUserSnake,
  owner: SECURITY_SOLUTION_OWNER,
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
  version: 'WzQ3LDFc',
};

export const basicCaseSnake: CaseResponse = {
  ...basicCase,
  status: CaseStatuses.open,
  closed_at: null,
  closed_by: null,
  comments: [basicCommentSnake],
  connector: { id: 'none', name: 'My Connector', type: ConnectorTypes.none, fields: null },
  created_at: basicCreatedAt,
  created_by: elasticUserSnake,
  external_service: null,
  updated_at: basicUpdatedAt,
  updated_by: elasticUserSnake,
  owner: SECURITY_SOLUTION_OWNER,
} as CaseResponse;

export const casesStatusSnake: CasesStatusResponse = {
  count_closed_cases: 130,
  count_in_progress_cases: 40,
  count_open_cases: 20,
};

export const pushConnectorId = '123';
export const pushSnake = {
  connector_id: pushConnectorId,
  connector_name: 'connector name',
  external_id: 'external_id',
  external_title: 'external title',
  external_url: 'basicPush.com',
};

export const basicPushSnake = {
  ...pushSnake,
  pushed_at: basicUpdatedAt,
  pushed_by: elasticUserSnake,
};

export const pushedCaseSnake = {
  ...basicCaseSnake,
  connector: {
    id: '123',
    name: 'My Connector',
    type: ConnectorTypes.jira,
    fields: null,
  },
  external_service: { ...basicPushSnake, connector_id: pushConnectorId },
};

export const reporters: string[] = ['alexis', 'kim', 'maria', 'steph'];
export const respReporters = [
  { username: 'alexis', full_name: null, email: null },
  { username: 'kim', full_name: null, email: null },
  { username: 'maria', full_name: null, email: null },
  { username: 'steph', full_name: null, email: null },
];
export const casesSnake: CasesResponse = [
  basicCaseSnake,
  { ...pushedCaseSnake, id: '1', totalComment: 0, comments: [] },
  { ...pushedCaseSnake, updated_at: laterTime, id: '2', totalComment: 0, comments: [] },
  { ...basicCaseSnake, id: '3', totalComment: 0, comments: [] },
  { ...basicCaseSnake, id: '4', totalComment: 0, comments: [] },
];

export const allCasesSnake: CasesFindResponse = {
  cases: casesSnake,
  page: 1,
  per_page: 5,
  total: 10,
  ...casesStatusSnake,
};

const basicActionSnake = {
  created_at: basicCreatedAt,
  created_by: elasticUserSnake,
  case_id: basicCaseId,
  comment_id: null,
  owner: SECURITY_SOLUTION_OWNER,
};

export const getUserActionSnake = (
  type: UserActionTypes,
  action: UserAction,
  payload?: Record<string, unknown>
): CaseUserActionResponse => {
  const isPushToService = type === ActionTypes.pushed;

  return {
    ...basicActionSnake,
    action_id: `${type}-${action}`,
    type,
    action,
    comment_id: type === 'comment' ? basicCommentId : null,
    payload: isPushToService ? { externalService: basicPushSnake } : payload ?? basicAction.payload,
  } as unknown as CaseUserActionResponse;
};

export const caseUserActionsSnake: CaseUserActionsResponse = [
  getUserActionSnake('description', Actions.create, { description: 'a desc' }),
  getUserActionSnake('comment', Actions.create, {
    comment: { comment: 'a comment', type: CommentType.user, owner: SECURITY_SOLUTION_OWNER },
  }),
  getUserActionSnake('description', Actions.update, { description: 'a desc updated' }),
];

export const getUserAction = (
  type: UserActionTypes,
  action: UserAction,
  overrides?: Record<string, unknown>
): CaseUserActions => {
  return {
    ...basicAction,
    actionId: `${type}-${action}`,
    type,
    action,
    commentId: type === 'comment' ? basicCommentId : null,
    payload: type === 'pushed' ? { externalService: basicPush } : basicAction.payload,
    ...overrides,
  } as CaseUserActions;
};

export const getJiraConnector = (overrides?: Partial<CaseConnector>): CaseConnector => {
  return {
    id: '123',
    name: 'jira1',
    ...jiraFields,
    ...overrides,
    type: ConnectorTypes.jira as const,
  } as CaseConnector;
};

export const jiraFields = { fields: { issueType: '10006', priority: null, parent: null } };

export const getAlertUserAction = (): SnakeToCamelCase<
  UserActionWithResponse<CommentUserAction>
> => ({
  ...basicAction,
  actionId: 'alert-action-id',
  action: Actions.create,
  commentId: 'alert-comment-id',
  type: ActionTypes.comment,
  payload: {
    comment: {
      type: CommentType.alert,
      alertId: 'alert-id-1',
      index: 'index-id-1',
      owner: SECURITY_SOLUTION_OWNER,
      rule: {
        id: 'rule-id-1',
        name: 'Awesome rule',
      },
    },
  },
});

export const getHostIsolationUserAction = (): SnakeToCamelCase<
  UserActionWithResponse<CommentUserAction>
> => ({
  ...basicAction,
  actionId: 'isolate-action-id',
  type: ActionTypes.comment,
  action: Actions.create,
  commentId: 'isolate-comment-id',
  payload: {
    comment: {
      type: CommentType.actions,
      comment: 'a comment',
      actions: { targets: [], type: 'test' },
      owner: SECURITY_SOLUTION_OWNER,
    },
  },
});

export const caseUserActions: CaseUserActions[] = [
  getUserAction('description', Actions.create, { payload: { description: 'a desc' } }),
  getUserAction('comment', Actions.create, {
    payload: {
      comment: { comment: 'a comment', type: CommentType.user, owner: SECURITY_SOLUTION_OWNER },
    },
  }),
  getUserAction('description', Actions.update, { payload: { description: 'a desc updated' } }),
];

// components tests
export const useGetCasesMockState: UseGetCasesState = {
  data: allCases,
  loading: [],
  selectedCases: [],
  isError: false,
  queryParams: DEFAULT_QUERY_PARAMS,
  filterOptions: DEFAULT_FILTER_OPTIONS,
};

export const basicCaseClosed: Case = {
  ...basicCase,
  closedAt: '2020-02-25T23:06:33.798Z',
  closedBy: elasticUser,
  status: CaseStatuses.closed,
};
