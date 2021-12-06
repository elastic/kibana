/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionLicense, AllCases, Case, CasesStatus, CaseUserActions, Comment } from './types';

import { isCreateConnector, isPush, isUpdateConnector } from '../../common/utils/user_actions';
import { ResolvedCase } from '../../common/ui/types';
import {
  AssociationType,
  CaseUserActionConnector,
  CaseResponse,
  CasesFindResponse,
  CasesResponse,
  CasesStatusResponse,
  CaseStatuses,
  CaseType,
  CaseUserActionsResponse,
  CommentResponse,
  CommentType,
  ConnectorTypes,
  UserAction,
  UserActionField,
} from '../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { UseGetCasesState, DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './use_get_cases';
export { connectorsMock } from './configure/mock';

export const basicCaseId = 'basic-case-id';
export const basicSubCaseId = 'basic-sub-case-id';
const basicCommentId = 'basic-comment-id';
const basicCreatedAt = '2020-02-19T23:06:33.798Z';
const basicUpdatedAt = '2020-02-20T15:02:57.995Z';
const laterTime = '2020-02-28T15:02:57.995Z';

export const elasticUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const tags: string[] = ['coke', 'pepsi'];

export const basicComment: Comment = {
  associationType: AssociationType.case,
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
  associationType: AssociationType.case,
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
    associationType: AssociationType.case,
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
    associationType: AssociationType.case,
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
  type: CaseType.individual,
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

export const collectionCase: Case = {
  type: CaseType.collection,
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
  actionAt: basicCreatedAt,
  actionBy: elasticUser,
  oldValConnectorId: null,
  oldValue: null,
  newValConnectorId: null,
  newValue: 'what a cool value',
  caseId: basicCaseId,
  commentId: null,
  owner: SECURITY_SOLUTION_OWNER,
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
  associationType: AssociationType.case,
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
  action_at: basicCreatedAt,
  action_by: elasticUserSnake,
  old_value: null,
  new_value: 'what a cool value',
  case_id: basicCaseId,
  comment_id: null,
  owner: SECURITY_SOLUTION_OWNER,
};
export const getUserActionSnake = (af: UserActionField, a: UserAction) => {
  const isPushToService = a === 'push-to-service' && af[0] === 'pushed';

  return {
    ...basicActionSnake,
    action_id: `${af[0]}-${a}`,
    action_field: af,
    action: a,
    comment_id: af[0] === 'comment' ? basicCommentId : null,
    new_value: isPushToService ? JSON.stringify(basicPushSnake) : basicAction.newValue,
    new_val_connector_id: isPushToService ? pushConnectorId : null,
    old_val_connector_id: null,
  };
};

export const caseUserActionsSnake: CaseUserActionsResponse = [
  getUserActionSnake(['description'], 'create'),
  getUserActionSnake(['comment'], 'create'),
  getUserActionSnake(['description'], 'update'),
];

// user actions

export const getUserAction = (
  af: UserActionField,
  a: UserAction,
  overrides?: Partial<CaseUserActions>
): CaseUserActions => {
  return {
    ...basicAction,
    actionId: `${af[0]}-${a}`,
    actionField: af,
    action: a,
    commentId: af[0] === 'comment' ? basicCommentId : null,
    ...getValues(a, af, overrides),
  };
};

const getValues = (
  userAction: UserAction,
  actionFields: UserActionField,
  overrides?: Partial<CaseUserActions>
): Partial<CaseUserActions> => {
  if (isCreateConnector(userAction, actionFields)) {
    return {
      newValue:
        overrides?.newValue === undefined ? JSON.stringify(basicCaseSnake) : overrides.newValue,
      newValConnectorId: overrides?.newValConnectorId ?? null,
      oldValue: null,
      oldValConnectorId: null,
    };
  } else if (isUpdateConnector(userAction, actionFields)) {
    return {
      newValue:
        overrides?.newValue === undefined
          ? JSON.stringify({ name: 'My Connector', type: ConnectorTypes.none, fields: null })
          : overrides.newValue,
      newValConnectorId: overrides?.newValConnectorId ?? null,
      oldValue:
        overrides?.oldValue === undefined
          ? JSON.stringify({ name: 'My Connector2', type: ConnectorTypes.none, fields: null })
          : overrides.oldValue,
      oldValConnectorId: overrides?.oldValConnectorId ?? null,
    };
  } else if (isPush(userAction, actionFields)) {
    return {
      newValue:
        overrides?.newValue === undefined ? JSON.stringify(basicPushSnake) : overrides?.newValue,
      newValConnectorId:
        overrides?.newValConnectorId === undefined ? pushConnectorId : overrides.newValConnectorId,
      oldValue: overrides?.oldValue ?? null,
      oldValConnectorId: overrides?.oldValConnectorId ?? null,
    };
  } else {
    return {
      newValue: overrides?.newValue === undefined ? basicAction.newValue : overrides.newValue,
      newValConnectorId: overrides?.newValConnectorId ?? null,
      oldValue: overrides?.oldValue ?? null,
      oldValConnectorId: overrides?.oldValConnectorId ?? null,
    };
  }
};

export const getJiraConnectorWithoutId = (overrides?: Partial<CaseUserActionConnector>) => {
  return JSON.stringify({
    name: 'jira1',
    type: ConnectorTypes.jira,
    ...jiraFields,
    ...overrides,
  });
};

export const jiraFields = { fields: { issueType: '10006', priority: null, parent: null } };

export const getAlertUserAction = () => ({
  ...basicAction,
  actionId: 'alert-action-id',
  actionField: ['comment'],
  action: 'create',
  commentId: 'alert-comment-id',
  newValue: '{"type":"alert","alertId":"alert-id-1","index":"index-id-1"}',
});

export const getHostIsolationUserAction = () => ({
  ...basicAction,
  actionId: 'isolate-action-id',
  actionField: ['comment'] as UserActionField,
  action: 'create' as UserAction,
  commentId: 'isolate-comment-id',
  newValue: 'some value',
});

export const caseUserActions: CaseUserActions[] = [
  getUserAction(['description'], 'create'),
  getUserAction(['comment'], 'create'),
  getUserAction(['description'], 'update'),
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
