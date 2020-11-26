/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ServiceConnectorCaseParams,
  ServiceConnectorCommentParams,
  ConnectorMappingsAttributes,
} from '../../../../../common/api/connectors';

const entity = {
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: '2020-03-15T08:34:53.450Z',
  updatedBy: {
    fullName: 'Another User',
    username: 'anotherUser',
  },
};
export const comment: ServiceConnectorCommentParams = {
  comment: 'first comment',
  commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
  ...entity,
};
export const defaultPipes = ['informationCreated'];
export const params = {
  comments: [comment],
  description: 'a description',
  impact: '3',
  savedObjectId: '1231231231232',
  severity: '1',
  title: 'a title',
  urgency: '2',
  ...entity,
} as ServiceConnectorCaseParams;
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
