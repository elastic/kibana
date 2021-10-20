/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import { rewriteResponseToCamelCase } from '../rewrite_response_body';
import { getIssueTypes, getFieldsByIssueType, getIssues, getIssue } from './api';

const issueTypesResponse = {
  status: 'ok' as const,
  data: {
    projects: [
      {
        issuetypes: [
          {
            id: '10006',
            name: 'Task',
          },
          {
            id: '10007',
            name: 'Bug',
          },
        ],
      },
    ],
  },
  connector_id: 'test',
};

const fieldsResponse = {
  status: 'ok' as const,
  data: {
    projects: [
      {
        issuetypes: [
          {
            id: '10006',
            name: 'Task',
            fields: {
              summary: { fieldId: 'summary' },
              priority: {
                fieldId: 'priority',
                allowedValues: [
                  {
                    name: 'Highest',
                    id: '1',
                  },
                  {
                    name: 'High',
                    id: '2',
                  },
                  {
                    name: 'Medium',
                    id: '3',
                  },
                  {
                    name: 'Low',
                    id: '4',
                  },
                  {
                    name: 'Lowest',
                    id: '5',
                  },
                ],
                defaultValue: {
                  name: 'Medium',
                  id: '3',
                },
              },
            },
          },
        ],
      },
    ],
  },
  connector_id: 'test',
};

const singleIssue = {
  id: '10267',
  key: 'RJ-107',
  title: 'some title',
};

const issueResponse = {
  status: 'ok' as const,
  data: singleIssue,
  connector_id: 'test',
  service_message: undefined,
};

const issuesResponse = {
  ...issueResponse,
  data: [singleIssue],
};

describe('Jira API', () => {
  const http = httpServiceMock.createStartContract();

  beforeEach(() => jest.resetAllMocks());

  describe('getIssueTypes', () => {
    test('should call get issue types API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(issueTypesResponse);
      const res = await getIssueTypes({ http, signal: abortCtrl.signal, connectorId: 'te/st' });
      expect(res).toEqual(rewriteResponseToCamelCase(issueTypesResponse));
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"issueTypes","subActionParams":{}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getFieldsByIssueType', () => {
    test('should call get fields API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(fieldsResponse);
      const res = await getFieldsByIssueType({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
        id: '10006',
      });

      expect(res).toEqual(rewriteResponseToCamelCase(fieldsResponse));
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"fieldsByIssueType","subActionParams":{"id":"10006"}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getIssues', () => {
    test('should call get fields API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(issuesResponse);
      const res = await getIssues({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
        title: 'test issue',
      });

      expect(res).toEqual(rewriteResponseToCamelCase(issuesResponse));
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"issues","subActionParams":{"title":"test issue"}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getIssue', () => {
    test('should call get fields API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(issueResponse);
      const res = await getIssue({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
        id: 'RJ-107',
      });

      expect(res).toEqual(rewriteResponseToCamelCase(issueResponse));
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"issue","subActionParams":{"id":"RJ-107"}}}',
        signal: abortCtrl.signal,
      });
    });
  });
});
