/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CommentResponse,
  CommentType,
  ConnectorMappingsAttributes,
  CaseUserActionsResponse,
  AssociationType,
} from '../../../common/api';

import { BasicParams } from './types';

export const updateUser = {
  updated_at: '2020-03-13T08:34:53.450Z',
  updated_by: { full_name: 'Another User', username: 'another', email: 'elastic@elastic.co' },
};

const entity = {
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' },
  updatedAt: null,
  updatedBy: null,
};

export const comment: CommentResponse = {
  associationType: AssociationType.case,
  id: 'mock-comment-1',
  comment: 'Wow, good luck catching that bad meanie!',
  type: CommentType.user as const,
  created_at: '2019-11-25T21:55:00.177Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const commentAlert: CommentResponse = {
  associationType: AssociationType.case,
  id: 'mock-comment-1',
  alertId: 'alert-id-1',
  index: 'alert-index-1',
  rule: {
    id: 'rule-id-1',
    name: 'rule-name-1',
  },
  type: CommentType.alert as const,
  created_at: '2019-11-25T21:55:00.177Z',
  created_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  pushed_at: null,
  pushed_by: null,
  updated_at: '2019-11-25T21:55:00.177Z',
  updated_by: {
    full_name: 'elastic',
    email: 'testemail@elastic.co',
    username: 'elastic',
  },
  version: 'WzEsMV0=',
};

export const defaultPipes = ['informationCreated'];
export const basicParams: BasicParams = {
  description: 'a description',
  title: 'a title',
  ...entity,
};

export const mappings: ConnectorMappingsAttributes[] = [
  {
    source: 'title',
    target: 'short_description',
    action_type: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    action_type: 'append',
  },
  {
    source: 'comments',
    target: 'comments',
    action_type: 'append',
  },
];

export const userActions: CaseUserActionsResponse = [
  {
    action_field: ['description', 'status', 'tags', 'title', 'connector', 'settings'],
    action: 'create',
    action_at: '2021-02-03T17:41:03.771Z',
    action_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    new_value:
      '{"title":"Case SIR","tags":["sir"],"description":"testing sir","connector":{"id":"456","name":"ServiceNow SN","type":".servicenow-sir","fields":{"category":"Denial of Service","destIp":true,"malwareHash":true,"malwareUrl":true,"priority":"2","sourceIp":true,"subcategory":"45"}},"settings":{"syncAlerts":true}}',
    old_value: null,
    action_id: 'fd830c60-6646-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: null,
  },
  {
    action_field: ['pushed'],
    action: 'push-to-service',
    action_at: '2021-02-03T17:41:26.108Z',
    action_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    new_value:
      '{"pushed_at":"2021-02-03T17:41:26.108Z","pushed_by":{"username":"elastic","full_name":"Elastic","email":"elastic@elastic.co"},"connector_id":"456","connector_name":"ServiceNow SN","external_id":"external-id","external_title":"SIR0010037","external_url":"https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id"}',
    old_value: null,
    action_id: '0a801750-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: null,
  },
  {
    action_field: ['comment'],
    action: 'create',
    action_at: '2021-02-03T17:44:21.067Z',
    action_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    new_value: '{"type":"alert","alertId":"alert-id-1","index":".siem-signals-default-000008"}',
    old_value: null,
    action_id: '7373eb60-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: 'comment-alert-1',
  },
  {
    action_field: ['comment'],
    action: 'create',
    action_at: '2021-02-03T17:44:33.078Z',
    action_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    new_value: '{"type":"alert","alertId":"alert-id-2","index":".siem-signals-default-000008"}',
    old_value: null,
    action_id: '7abc6410-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: 'comment-alert-2',
  },
  {
    action_field: ['pushed'],
    action: 'push-to-service',
    action_at: '2021-02-03T17:45:29.400Z',
    action_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    new_value:
      '{"pushed_at":"2021-02-03T17:45:29.400Z","pushed_by":{"username":"elastic","full_name":"Elastic","email":"elastic@elastic.co"},"connector_id":"456","connector_name":"ServiceNow SN","external_id":"external-id","external_title":"SIR0010037","external_url":"https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id"}',
    old_value: null,
    action_id: '9b91d8f0-6647-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: null,
  },
  {
    action_field: ['comment'],
    action: 'create',
    action_at: '2021-02-03T17:48:30.616Z',
    action_by: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic',
      username: 'elastic',
    },
    new_value: '{"comment":"a comment!","type":"user"}',
    old_value: null,
    action_id: '0818e5e0-6648-11eb-a291-51bf6b175a53',
    case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
    comment_id: 'comment-user-1',
  },
];
