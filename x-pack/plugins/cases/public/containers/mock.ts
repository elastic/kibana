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
import { covertToSnakeCase } from './utils';

export { connectorsMock } from '../common/mock/connectors';
export const basicCaseId = 'basic-case-id';
export const caseWithAlertsId = 'case-with-alerts-id';
export const caseWithAlertsSyncOffId = 'case-with-alerts-syncoff-id';

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
};

export const caseWithAlerts = {
  ...basicCase,
  totalAlerts: 2,
  id: caseWithAlertsId,
};
export const caseWithAlertsSyncOff = {
  ...basicCase,
  totalAlerts: 2,
  settings: {
    syncAlerts: false,
  },
  id: caseWithAlertsSyncOffId,
};

export const basicResolvedCase: ResolvedCase = {
  case: basicCase,
  outcome: 'aliasMatch',
  aliasTargetId: `${basicCase.id}_2`,
};

export const basicCaseNumericValueFeatures: CaseMetricsFeature[] = [
  'alerts.count',
  'alerts.users',
  'alerts.hosts',
  'actions.isolateHost',
  'connectors',
];

export const basicCaseStatusFeatures: CaseMetricsFeature[] = ['lifespan'];

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
      reopenDates: [],
    },
  },
};

export const mockCase: Case = {
  owner: SECURITY_SOLUTION_OWNER,
  closedAt: null,
  closedBy: null,
  id: 'mock-id',
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
    email: 'elastic@elastic.co',
    fullName: 'Elastic',
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
  caseWithAlerts,
  caseWithAlertsSyncOff,
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

export const caseWithAlertsSnake = {
  ...basicCaseSnake,
  totalAlerts: 2,
  id: caseWithAlertsId,
};
export const caseWithAlertsSyncOffSnake = {
  ...basicCaseSnake,
  totalAlerts: 2,
  settings: {
    syncAlerts: false,
  },
  id: caseWithAlertsSyncOffId,
};

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
  caseWithAlertsSnake,
  caseWithAlertsSyncOffSnake,
];

export const allCasesSnake: CasesFindResponse = {
  cases: casesSnake,
  page: 1,
  per_page: 5,
  total: 10,
  ...casesStatusSnake,
};

export const getUserAction = (
  type: UserActionTypes,
  action: UserAction,
  overrides?: Record<string, unknown>
): CaseUserActions => {
  const commonProperties = {
    ...basicAction,
    actionId: `${type}-${action}`,
    action,
  };

  const externalService = {
    connectorId: pushConnectorId,
    connectorName: 'connector name',
    externalId: 'external_id',
    externalTitle: 'external title',
    externalUrl: 'basicPush.com',
    pushedAt: basicUpdatedAt,
    pushedBy: elasticUser,
  };

  switch (type) {
    case ActionTypes.comment:
      return {
        ...commonProperties,
        type: ActionTypes.comment,
        payload: {
          comment: { comment: 'a comment', type: CommentType.user, owner: SECURITY_SOLUTION_OWNER },
        },
        commentId: basicCommentId,
        ...overrides,
      };
    case ActionTypes.connector:
      return {
        ...commonProperties,
        type: ActionTypes.connector,
        payload: {
          connector: { ...getJiraConnector() },
        },
        ...overrides,
      };
    case ActionTypes.create_case:
      return {
        ...commonProperties,
        type: ActionTypes.create_case,
        payload: {
          description: 'a desc',
          connector: { ...getJiraConnector() },
          status: CaseStatuses.open,
          title: 'a title',
          tags: ['a tag'],
          settings: { syncAlerts: true },
          owner: SECURITY_SOLUTION_OWNER,
        },
        ...overrides,
      };
    case ActionTypes.delete_case:
      return {
        ...commonProperties,
        type: ActionTypes.delete_case,
        payload: {},
        ...overrides,
      };
    case ActionTypes.description:
      return {
        ...commonProperties,
        type: ActionTypes.description,
        payload: { description: 'a desc' },
        ...overrides,
      };
    case ActionTypes.pushed:
      return {
        ...commonProperties,
        type: ActionTypes.pushed,
        payload: {
          externalService,
        },
        ...overrides,
      };
    case ActionTypes.settings:
      return {
        ...commonProperties,
        type: ActionTypes.settings,
        payload: { settings: { syncAlerts: true } },
        ...overrides,
      };
    case ActionTypes.status:
      return {
        ...commonProperties,
        type: ActionTypes.status,
        payload: { status: CaseStatuses.open },
        ...overrides,
      };
    case ActionTypes.tags:
      return {
        ...commonProperties,
        type: ActionTypes.tags,
        payload: { tags: ['a tag'] },
        ...overrides,
      };
    case ActionTypes.title:
      return {
        ...commonProperties,
        type: ActionTypes.title,
        payload: { title: 'a title' },
        ...overrides,
      };

    default:
      return {
        ...commonProperties,
        ...overrides,
      } as CaseUserActions;
  }
};

export const getUserActionSnake = (
  type: UserActionTypes,
  action: UserAction,
  overrides?: Record<string, unknown>
): CaseUserActionResponse => {
  return {
    ...covertToSnakeCase(getUserAction(type, action, overrides)),
  } as unknown as CaseUserActionResponse;
};

export const caseUserActionsSnake: CaseUserActionsResponse = [
  getUserActionSnake('description', Actions.create),
  getUserActionSnake('comment', Actions.create),
  getUserActionSnake('description', Actions.update),
];

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
  ...getUserAction(ActionTypes.comment, Actions.create),
  actionId: 'alert-action-id',
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
  ...getUserAction(ActionTypes.comment, Actions.create),
  actionId: 'isolate-action-id',
  type: ActionTypes.comment,
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
  getUserAction('description', Actions.create),
  getUserAction('comment', Actions.create),
  getUserAction('description', Actions.update),
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
