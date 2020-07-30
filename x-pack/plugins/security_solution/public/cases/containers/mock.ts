/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionLicense, AllCases, Case, CasesStatus, CaseUserActions, Comment } from './types';

import {
  CommentResponse,
  ServiceConnectorCaseResponse,
  Status,
  UserAction,
  UserActionField,
  CaseResponse,
  CasesStatusResponse,
  CaseUserActionsResponse,
  CasesResponse,
  CasesFindResponse,
} from '../../../../case/common/api/cases';
import { UseGetCasesState, DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS } from './use_get_cases';
export { connectorsMock } from './configure/mock';

export const basicCaseId = 'basic-case-id';
const basicCommentId = 'basic-comment-id';
const basicCreatedAt = '2020-02-19T23:06:33.798Z';
const basicUpdatedAt = '2020-02-20T15:02:57.995Z';
const laterTime = '2020-02-28T15:02:57.995Z';
export const elasticUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};

export const serviceConnectorUser = {
  fullName: 'Leslie Knope',
  username: 'lknope',
};

export const tags: string[] = ['coke', 'pepsi'];

export const basicComment: Comment = {
  comment: 'Solve this fast!',
  id: basicCommentId,
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  pushedAt: null,
  pushedBy: null,
  updatedAt: null,
  updatedBy: null,
  version: 'WzQ3LDFc',
};

export const basicCase: Case = {
  closedAt: null,
  closedBy: null,
  id: basicCaseId,
  comments: [basicComment],
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  connectorId: '123',
  description: 'Security banana Issue',
  externalService: null,
  status: 'open',
  tags,
  title: 'Another horrible breach!!',
  totalComment: 1,
  updatedAt: basicUpdatedAt,
  updatedBy: elasticUser,
  version: 'WzQ3LDFd',
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
  countClosedCases: 130,
  countOpenCases: 20,
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
  externalService: basicPush,
};

export const serviceConnector: ServiceConnectorCaseResponse = {
  title: '123',
  id: '444',
  pushedDate: basicUpdatedAt,
  url: 'connector.com',
  comments: [
    {
      commentId: basicCommentId,
      pushedDate: basicUpdatedAt,
    },
  ],
};

const basicAction = {
  actionAt: basicCreatedAt,
  actionBy: elasticUser,
  oldValue: null,
  newValue: 'what a cool value',
  caseId: basicCaseId,
  commentId: null,
};

export const casePushParams = {
  actionBy: elasticUser,
  savedObjectId: basicCaseId,
  createdAt: basicCreatedAt,
  createdBy: elasticUser,
  externalId: null,
  title: 'what a cool value',
  commentId: null,
  updatedAt: basicCreatedAt,
  updatedBy: elasticUser,
  description: 'nice',
  comments: null,
};
export const actionTypeExecutorResult = {
  actionId: 'string',
  status: 'ok',
  data: serviceConnector,
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
];

// Snake case for mock api responses
export const elasticUserSnake = {
  full_name: 'Leslie Knope',
  username: 'lknope',
  email: 'leslie.knope@elastic.co',
};
export const basicCommentSnake: CommentResponse = {
  ...basicComment,
  comment: 'Solve this fast!',
  id: basicCommentId,
  created_at: basicCreatedAt,
  created_by: elasticUserSnake,
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
};

export const basicCaseSnake: CaseResponse = {
  ...basicCase,
  status: 'open' as Status,
  closed_at: null,
  closed_by: null,
  comments: [basicCommentSnake],
  connector_id: '123',
  created_at: basicCreatedAt,
  created_by: elasticUserSnake,
  external_service: null,
  updated_at: basicUpdatedAt,
  updated_by: elasticUserSnake,
};

export const casesStatusSnake: CasesStatusResponse = {
  count_closed_cases: 130,
  count_open_cases: 20,
};

export const pushSnake = {
  connector_id: '123',
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
  external_service: basicPushSnake,
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
};
export const getUserActionSnake = (af: UserActionField, a: UserAction) => ({
  ...basicActionSnake,
  action_id: `${af[0]}-${a}`,
  action_field: af,
  action: a,
  comment_id: af[0] === 'comment' ? basicCommentId : null,
  new_value:
    a === 'push-to-service' && af[0] === 'pushed'
      ? JSON.stringify(basicPushSnake)
      : basicAction.newValue,
});

export const caseUserActionsSnake: CaseUserActionsResponse = [
  getUserActionSnake(['description'], 'create'),
  getUserActionSnake(['comment'], 'create'),
  getUserActionSnake(['description'], 'update'),
];

// user actions

export const getUserAction = (af: UserActionField, a: UserAction) => ({
  ...basicAction,
  actionId: `${af[0]}-${a}`,
  actionField: af,
  action: a,
  commentId: af[0] === 'comment' ? basicCommentId : null,
  newValue:
    a === 'push-to-service' && af[0] === 'pushed'
      ? JSON.stringify(basicPushSnake)
      : basicAction.newValue,
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
  status: 'closed',
};
