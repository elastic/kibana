/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorTypes } from '../../../common/api';
import { mockCases, mockCaseConfigure } from '../../routes/api/__fixtures__';

const createdAt = mockCases[0].attributes.created_at;
const updatedAt = mockCases[0].attributes.updated_at;

export const elasticUser = mockCases[0].attributes.created_by;

export const comment = {
  comment: 'Solve this fast!',
  id: 'comment-1',
  createdAt,
  createdBy: elasticUser,
  pushedAt: null,
  pushedBy: null,
  updatedAt: null,
  updatedBy: null,
  version: 'WzQ3LDFc',
};

export const tags: string[] = ['defacement'];
export const connector = mockCases[0].attributes.connector;

export const postCase = {
  title: mockCases[0].attributes.title,
  description: mockCases[0].attributes.description,
  tags,
  connector: { ...connector, fields: null },
};

export const patchCases = {
  cases: [
    {
      id: mockCases[0].id,
      title: 'Title updated',
      description: 'Description updated',
      version: mockCases[0].version ?? 'WzAsMV0=',
    },
  ],
};

export const patchConnector = {
  cases: [
    {
      id: mockCases[0].id,
      connector: { id: 'jira', name: 'jira', type: ConnectorTypes.jira, fields: null },
      version: mockCases[0].version ?? 'WzAsMV0=',
    },
  ],
};

export const theCase = {
  closedAt: null,
  closedBy: null,
  id: 'case-1',
  comments: [comment],
  createdAt,
  createdBy: elasticUser,
  connector,
  description: 'This is a brand new case of a bad meanie defacing data',
  externalService: null,
  status: 'open',
  tags,
  title: 'Super Bad Security Issue',
  totalComment: 1,
  updatedAt,
  updatedBy: elasticUser,
  version: 'WzQ3LDFd',
};

export const casePostResponse = {
  ...mockCases[0],
  attributes: {
    ...mockCases[0].attributes,
    updated_at: null,
    updated_by: null,
  },
};

export const caseConfigureResponse = {
  saved_objects: mockCaseConfigure[0],
  total: 1,
  per_page: 20,
  page: 1,
};

export const getCasesResponse = {
  saved_objects: [mockCases[0]],
  total: 1,
  per_page: 20,
  page: 1,
};
