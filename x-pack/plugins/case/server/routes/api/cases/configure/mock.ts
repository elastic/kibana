/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ServiceConnectorCaseParams,
  ServiceConnectorCommentParams,
  ConnectorMappingsAttributes,
  ConnectorTypes,
} from '../../../../../common/api/connectors';
export const updateUser = {
  updatedAt: '2020-03-13T08:34:53.450Z',
  updatedBy: { fullName: 'Another User', username: 'another' },
};
const entity = {
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: null,
  updatedBy: null,
};
export const comment: ServiceConnectorCommentParams = {
  comment: 'first comment',
  commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
  ...entity,
};
export const defaultPipes = ['informationCreated'];
const basicParams = {
  comments: [comment],
  description: 'a description',
  title: 'a title',
  savedObjectId: '1231231231232',
  externalId: null,
};
export const params = {
  [ConnectorTypes.jira]: {
    ...basicParams,
    issueType: '10003',
    priority: 'Highest',
    parent: '5002',
    ...entity,
  } as ServiceConnectorCaseParams,
  [ConnectorTypes.resilient]: {
    ...basicParams,
    incidentTypes: ['10003'],
    severityCode: '1',
    ...entity,
  } as ServiceConnectorCaseParams,
  [ConnectorTypes.servicenow]: {
    ...basicParams,
    impact: '3',
    severity: '1',
    urgency: '2',
    ...entity,
  } as ServiceConnectorCaseParams,
  [ConnectorTypes.none]: {},
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
