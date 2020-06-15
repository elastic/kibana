/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { createExternalService } from './service';
import * as utils from '../lib/axios_utils';
import { ExternalService } from '../case/types';

jest.mock('axios');
jest.mock('../lib/axios_utils', () => {
  const originalUtils = jest.requireActual('../lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = utils.request as jest.Mock;

describe('Jira service', () => {
  let service: ExternalService;

  beforeAll(() => {
    service = createExternalService({
      config: { apiUrl: 'https://siem-kibana.atlassian.net', projectKey: 'CK' },
      secrets: { apiToken: 'token', email: 'elastic@elastic.com' },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExternalService', () => {
    test('throws without url', () => {
      expect(() =>
        createExternalService({
          config: { apiUrl: null, projectKey: 'CK' },
          secrets: { apiToken: 'token', email: 'elastic@elastic.com' },
        })
      ).toThrow();
    });

    test('throws without projectKey', () => {
      expect(() =>
        createExternalService({
          config: { apiUrl: 'test.com', projectKey: null },
          secrets: { apiToken: 'token', email: 'elastic@elastic.com' },
        })
      ).toThrow();
    });

    test('throws without username', () => {
      expect(() =>
        createExternalService({
          config: { apiUrl: 'test.com' },
          secrets: { apiToken: '', email: 'elastic@elastic.com' },
        })
      ).toThrow();
    });

    test('throws without password', () => {
      expect(() =>
        createExternalService({
          config: { apiUrl: 'test.com' },
          secrets: { apiToken: '', email: undefined },
        })
      ).toThrow();
    });
  });

  describe('getIncident', () => {
    test('it returns the incident correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: { id: '1', key: 'CK-1', fields: { summary: 'title', description: 'description' } },
      }));
      const res = await service.getIncident('1');
      expect(res).toEqual({ id: '1', key: 'CK-1', summary: 'title', description: 'description' });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { id: '1', key: 'CK-1' },
      }));

      await service.getIncident('1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue/1',
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      expect(service.getIncident('1')).rejects.toThrow(
        'Unable to get incident with id 1. Error: An error has occurred'
      );
    });
  });

  describe('createIncident', () => {
    test('it creates the incident correctly', async () => {
      // The response from Jira when creating an issue contains only the key and the id.
      // The service makes two calls when creating an issue. One to create and one to get
      // the created incident with all the necessary fields.
      requestMock.mockImplementationOnce(() => ({
        data: { id: '1', key: 'CK-1', fields: { summary: 'title', description: 'description' } },
      }));

      requestMock.mockImplementationOnce(() => ({
        data: { id: '1', key: 'CK-1', fields: { created: '2020-04-27T10:59:46.202Z' } },
      }));

      const res = await service.createIncident({
        incident: { summary: 'title', description: 'desc' },
      });

      expect(res).toEqual({
        title: 'CK-1',
        id: '1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          key: 'CK-1',
          fields: { created: '2020-04-27T10:59:46.202Z' },
        },
      }));

      await service.createIncident({
        incident: { summary: 'title', description: 'desc' },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue',
        method: 'post',
        data: {
          fields: {
            summary: 'title',
            description: 'desc',
            project: { key: 'CK' },
            issuetype: { name: 'Task' },
          },
        },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      expect(
        service.createIncident({
          incident: { summary: 'title', description: 'desc' },
        })
      ).rejects.toThrow('[Action][Jira]: Unable to create incident. Error: An error has occurred');
    });
  });

  describe('updateIncident', () => {
    test('it updates the incident correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          key: 'CK-1',
          fields: { updated: '2020-04-27T10:59:46.202Z' },
        },
      }));

      const res = await service.updateIncident({
        incidentId: '1',
        incident: { summary: 'title', description: 'desc' },
      });

      expect(res).toEqual({
        title: 'CK-1',
        id: '1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          key: 'CK-1',
          fields: { updated: '2020-04-27T10:59:46.202Z' },
        },
      }));

      await service.updateIncident({
        incidentId: '1',
        incident: { summary: 'title', description: 'desc' },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        method: 'put',
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue/1',
        data: { fields: { summary: 'title', description: 'desc' } },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      expect(
        service.updateIncident({
          incidentId: '1',
          incident: { summary: 'title', description: 'desc' },
        })
      ).rejects.toThrow(
        '[Action][Jira]: Unable to update incident with id 1. Error: An error has occurred'
      );
    });
  });

  describe('createComment', () => {
    test('it creates the comment correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          key: 'CK-1',
          created: '2020-04-27T10:59:46.202Z',
        },
      }));

      const res = await service.createComment({
        incidentId: '1',
        comment: { comment: 'comment', commentId: 'comment-1' },
        field: 'comments',
      });

      expect(res).toEqual({
        commentId: 'comment-1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        externalCommentId: '1',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          key: 'CK-1',
          created: '2020-04-27T10:59:46.202Z',
        },
      }));

      await service.createComment({
        incidentId: '1',
        comment: { comment: 'comment', commentId: 'comment-1' },
        field: 'my_field',
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        method: 'post',
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue/1/comment',
        data: { body: 'comment' },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      expect(
        service.createComment({
          incidentId: '1',
          comment: { comment: 'comment', commentId: 'comment-1' },
          field: 'comments',
        })
      ).rejects.toThrow(
        '[Action][Jira]: Unable to create comment at incident with id 1. Error: An error has occurred'
      );
    });
  });
});
