/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  BasicParams,
  CommentResponse,
  CommentType,
  ConnectorMappingsAttributes,
} from '../../../common/api';

export const updateUser = {
  updatedAt: '2020-03-13T08:34:53.450Z',
  updatedBy: { full_name: 'Another User', username: 'another' },
};

const entity = {
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' },
  updatedAt: null,
  updatedBy: null,
};

export const comment: CommentResponse = {
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
