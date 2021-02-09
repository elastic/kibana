/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { createExternalService } from './service';
import * as utils from '../lib/axios_utils';
import { ExternalService } from './types';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

interface ResponseError extends Error {
  response?: { data: { errors: Record<string, string> } };
}

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
const configurationUtilities = actionsConfigMock.create();

const issueTypesResponse = {
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
};

const fieldsResponse = {
  data: {
    projects: [
      {
        issuetypes: [
          {
            id: '10006',
            name: 'Task',
            fields: {
              summary: { required: true, schema: { type: 'string' }, fieldId: 'summary' },
              priority: {
                required: false,
                schema: { type: 'string' },
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
};

const issueResponse = {
  id: '10267',
  key: 'RJ-107',
  fields: { summary: 'Test title' },
};

const issuesResponse = [issueResponse];

describe('Jira service', () => {
  let service: ExternalService;

  beforeAll(() => {
    service = createExternalService(
      {
        // The trailing slash at the end of the url is intended.
        // All API calls need to have the trailing slash removed.
        config: { apiUrl: 'https://siem-kibana.atlassian.net/', projectKey: 'CK' },
        secrets: { apiToken: 'token', email: 'elastic@elastic.com' },
      },
      logger,
      configurationUtilities
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExternalService', () => {
    test('throws without url', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: null, projectKey: 'CK' },
            secrets: { apiToken: 'token', email: 'elastic@elastic.com' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without projectKey', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: 'test.com', projectKey: null },
            secrets: { apiToken: 'token', email: 'elastic@elastic.com' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without username', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: 'test.com' },
            secrets: { apiToken: '', email: 'elastic@elastic.com' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without password', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: 'test.com' },
            secrets: { apiToken: '', email: undefined },
          },
          logger,
          configurationUtilities
        )
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
        logger,
        configurationUtilities,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { summary: 'Required field' } } };
        throw error;
      });
      await expect(service.getIncident('1')).rejects.toThrow(
        '[Action][Jira]: Unable to get incident with id 1. Error: An error has occurred Reason: Required field'
      );
    });
  });

  describe('createIncident', () => {
    test('it creates the incident correctly', async () => {
      /* The response from Jira when creating an issue contains only the key and the id.
      The function makes the following calls when creating an issue:
        1. Get issueTypes to set a default ONLY when incident.issueType is missing
        2. Create the issue.
        3. Get the created issue with all the necessary fields.
    */
      requestMock.mockImplementationOnce(() => ({
        data: { id: '1', key: 'CK-1', fields: { summary: 'title', description: 'description' } },
      }));

      requestMock.mockImplementationOnce(() => ({
        data: { id: '1', key: 'CK-1', fields: { created: '2020-04-27T10:59:46.202Z' } },
      }));

      const res = await service.createIncident({
        incident: {
          summary: 'title',
          description: 'desc',
          labels: [],
          issueType: '10006',
          priority: 'High',
          parent: null,
        },
      });

      expect(res).toEqual({
        title: 'CK-1',
        id: '1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      });
    });

    test('it creates the incident correctly without issue type', async () => {
      /* The response from Jira when creating an issue contains only the key and the id.
      The function makes the following calls when creating an issue:
        1. Get issueTypes to set a default ONLY when incident.issueType is missing
        2. Create the issue.
        3. Get the created issue with all the necessary fields.
    */
      // getIssueType mocks
      requestMock.mockImplementationOnce(() => ({
        data: {
          capabilities: {
            navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
          },
        },
      }));

      // getIssueType mocks
      requestMock.mockImplementationOnce(() => issueTypesResponse);

      requestMock.mockImplementationOnce(() => ({
        data: { id: '1', key: 'CK-1', fields: { summary: 'title', description: 'description' } },
      }));

      requestMock.mockImplementationOnce(() => ({
        data: { id: '1', key: 'CK-1', fields: { created: '2020-04-27T10:59:46.202Z' } },
      }));

      const res = await service.createIncident({
        incident: {
          summary: 'title',
          description: 'desc',
          labels: [],
          priority: 'High',
          issueType: null,
          parent: null,
        },
      });

      expect(res).toEqual({
        title: 'CK-1',
        id: '1',
        pushedDate: '2020-04-27T10:59:46.202Z',
        url: 'https://siem-kibana.atlassian.net/browse/CK-1',
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue',
        logger,
        method: 'post',
        configurationUtilities,
        data: {
          fields: {
            summary: 'title',
            description: 'desc',
            project: { key: 'CK' },
            issuetype: { id: '10006' },
            labels: [],
            priority: { name: 'High' },
          },
        },
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
        incident: {
          summary: 'title',
          description: 'desc',
          labels: [],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue',
        logger,
        method: 'post',
        configurationUtilities,
        data: {
          fields: {
            summary: 'title',
            description: 'desc',
            project: { key: 'CK' },
            issuetype: { id: '10006' },
            labels: [],
            priority: { name: 'High' },
            parent: { key: 'RJ-107' },
          },
        },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { summary: 'Required field' } } };
        throw error;
      });

      await expect(
        service.createIncident({
          incident: {
            summary: 'title',
            description: 'desc',
            labels: [],
            issueType: '10006',
            priority: 'High',
            parent: null,
          },
        })
      ).rejects.toThrow(
        '[Action][Jira]: Unable to create incident. Error: An error has occurred. Reason: Required field'
      );
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
        incident: {
          summary: 'title',
          description: 'desc',
          labels: [],
          issueType: '10006',
          priority: 'High',
          parent: null,
        },
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
        incident: {
          summary: 'title',
          description: 'desc',
          labels: [],
          issueType: '10006',
          priority: 'High',
          parent: 'RJ-107',
        },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        method: 'put',
        configurationUtilities,
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue/1',
        data: {
          fields: {
            summary: 'title',
            description: 'desc',
            labels: [],
            priority: { name: 'High' },
            issuetype: { id: '10006' },
            project: { key: 'CK' },
            parent: { key: 'RJ-107' },
          },
        },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { summary: 'Required field' } } };
        throw error;
      });

      await expect(
        service.updateIncident({
          incidentId: '1',
          incident: {
            summary: 'title',
            description: 'desc',
            labels: [],
            issueType: '10006',
            priority: 'High',
            parent: null,
          },
        })
      ).rejects.toThrow(
        '[Action][Jira]: Unable to update incident with id 1. Error: An error has occurred. Reason: Required field'
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
        comment: {
          comment: 'comment',
          commentId: 'comment-1',
        },
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
        comment: {
          comment: 'comment',
          commentId: 'comment-1',
        },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        method: 'post',
        configurationUtilities,
        url: 'https://siem-kibana.atlassian.net/rest/api/2/issue/1/comment',
        data: { body: 'comment' },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { summary: 'Required field' } } };
        throw error;
      });

      await expect(
        service.createComment({
          incidentId: '1',
          comment: {
            comment: 'comment',
            commentId: 'comment-1',
          },
        })
      ).rejects.toThrow(
        '[Action][Jira]: Unable to create comment at incident with id 1. Error: An error has occurred. Reason: Required field'
      );
    });
  });

  describe('getCapabilities', () => {
    test('it should return the capabilities', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          capabilities: {
            navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
          },
        },
      }));
      const res = await service.getCapabilities();
      expect(res).toEqual({
        capabilities: {
          navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
        },
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          capabilities: {
            navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
          },
        },
      }));

      await service.getCapabilities();

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        method: 'get',
        configurationUtilities,
        url: 'https://siem-kibana.atlassian.net/rest/capabilities',
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { capabilities: 'Could not get capabilities' } } };
        throw error;
      });

      await expect(service.getCapabilities()).rejects.toThrow(
        '[Action][Jira]: Unable to get capabilities. Error: An error has occurred. Reason: Could not get capabilities'
      );
    });

    test('it should throw an auth error', async () => {
      requestMock.mockImplementation(() => {
        const error = new Error('An error has occurred');
        // @ts-ignore this can happen!
        error.response = { data: 'Unauthorized' };
        throw error;
      });

      await expect(service.getCapabilities()).rejects.toThrow(
        '[Action][Jira]: Unable to get capabilities. Error: An error has occurred. Reason: Unauthorized'
      );
    });
  });

  describe('getIssueTypes', () => {
    describe('Old API', () => {
      test('it should return the issue types', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => issueTypesResponse);

        const res = await service.getIssueTypes();

        expect(res).toEqual([
          {
            id: '10006',
            name: 'Task',
          },
          {
            id: '10007',
            name: 'Bug',
          },
        ]);
      });

      test('it should call request with correct arguments', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => issueTypesResponse);

        await service.getIssueTypes();

        expect(requestMock).toHaveBeenLastCalledWith({
          axios,
          logger,
          method: 'get',
          configurationUtilities,
          url:
            'https://siem-kibana.atlassian.net/rest/api/2/issue/createmeta?projectKeys=CK&expand=projects.issuetypes.fields',
        });
      });

      test('it should throw an error', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
            },
          },
        }));

        requestMock.mockImplementation(() => {
          const error: ResponseError = new Error('An error has occurred');
          error.response = { data: { errors: { issuetypes: 'Could not get issue types' } } };
          throw error;
        });

        await expect(service.getIssueTypes()).rejects.toThrow(
          '[Action][Jira]: Unable to get issue types. Error: An error has occurred. Reason: Could not get issue types'
        );
      });
    });
    describe('New API', () => {
      test('it should return the issue types', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => ({
          data: {
            values: issueTypesResponse.data.projects[0].issuetypes,
          },
        }));

        const res = await service.getIssueTypes();

        expect(res).toEqual([
          {
            id: '10006',
            name: 'Task',
          },
          {
            id: '10007',
            name: 'Bug',
          },
        ]);
      });

      test('it should call request with correct arguments', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => ({
          data: {
            values: issueTypesResponse.data.projects[0].issuetypes,
          },
        }));

        await service.getIssueTypes();

        expect(requestMock).toHaveBeenLastCalledWith({
          axios,
          logger,
          method: 'get',
          configurationUtilities,
          url: 'https://siem-kibana.atlassian.net/rest/api/2/issue/createmeta/CK/issuetypes',
        });
      });

      test('it should throw an error', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }));

        requestMock.mockImplementation(() => {
          const error: ResponseError = new Error('An error has occurred');
          error.response = { data: { errors: { issuetypes: 'Could not get issue types' } } };
          throw error;
        });

        await expect(service.getIssueTypes()).rejects.toThrow(
          '[Action][Jira]: Unable to get issue types. Error: An error has occurred. Reason: Could not get issue types'
        );
      });
    });
  });

  describe('getFieldsByIssueType', () => {
    describe('Old API', () => {
      test('it should return the fields', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => fieldsResponse);

        const res = await service.getFieldsByIssueType('10006');

        expect(res).toEqual({
          priority: {
            required: false,
            schema: { type: 'string' },
            allowedValues: [
              { id: '1', name: 'Highest' },
              { id: '2', name: 'High' },
              { id: '3', name: 'Medium' },
              { id: '4', name: 'Low' },
              { id: '5', name: 'Lowest' },
            ],
            defaultValue: { id: '3', name: 'Medium' },
          },
          summary: {
            required: true,
            schema: { type: 'string' },
            allowedValues: [],
            defaultValue: {},
          },
        });
      });

      test('it should call request with correct arguments', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => fieldsResponse);

        await service.getFieldsByIssueType('10006');

        expect(requestMock).toHaveBeenLastCalledWith({
          axios,
          logger,
          method: 'get',
          configurationUtilities,
          url:
            'https://siem-kibana.atlassian.net/rest/api/2/issue/createmeta?projectKeys=CK&issuetypeIds=10006&expand=projects.issuetypes.fields',
        });
      });

      test('it should throw an error', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              navigation: 'https://siem-kibana.atlassian.net/rest/capabilities/navigation',
            },
          },
        }));

        requestMock.mockImplementation(() => {
          const error: ResponseError = new Error('An error has occurred');
          error.response = { data: { errors: { fields: 'Could not get fields' } } };
          throw error;
        });

        await expect(service.getFieldsByIssueType('10006')).rejects.toThrow(
          '[Action][Jira]: Unable to get fields. Error: An error has occurred. Reason: Could not get fields'
        );
      });
    });

    describe('New API', () => {
      test('it should return the fields', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => ({
          data: {
            values: [
              { required: true, schema: { type: 'string' }, fieldId: 'summary' },
              {
                required: false,
                schema: { type: 'string' },
                fieldId: 'priority',
                allowedValues: [
                  {
                    name: 'Medium',
                    id: '3',
                  },
                ],
                defaultValue: {
                  name: 'Medium',
                  id: '3',
                },
              },
            ],
          },
        }));

        const res = await service.getFieldsByIssueType('10006');

        expect(res).toEqual({
          priority: {
            required: false,
            schema: { type: 'string' },
            allowedValues: [{ id: '3', name: 'Medium' }],
            defaultValue: { id: '3', name: 'Medium' },
          },
          summary: {
            required: true,
            schema: { type: 'string' },
            allowedValues: [],
            defaultValue: {},
          },
        });
      });

      test('it should call request with correct arguments', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }));

        requestMock.mockImplementationOnce(() => ({
          data: {
            values: [
              { required: true, schema: { type: 'string' }, fieldId: 'summary' },
              {
                required: true,
                schema: { type: 'string' },
                fieldId: 'priority',
                allowedValues: [
                  {
                    name: 'Medium',
                    id: '3',
                  },
                ],
                defaultValue: {
                  name: 'Medium',
                  id: '3',
                },
              },
            ],
          },
        }));

        await service.getFieldsByIssueType('10006');

        expect(requestMock).toHaveBeenLastCalledWith({
          axios,
          logger,
          method: 'get',
          configurationUtilities,
          url: 'https://siem-kibana.atlassian.net/rest/api/2/issue/createmeta/CK/issuetypes/10006',
        });
      });

      test('it should throw an error', async () => {
        requestMock.mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }));

        requestMock.mockImplementation(() => {
          const error: ResponseError = new Error('An error has occurred');
          error.response = { data: { errors: { issuetypes: 'Could not get issue types' } } };
          throw error;
        });

        await expect(service.getFieldsByIssueType('10006')).rejects.toThrowError(
          '[Action][Jira]: Unable to get fields. Error: An error has occurred. Reason: Could not get issue types'
        );
      });
    });
  });

  describe('getIssues', () => {
    test('it should return the issues', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          issues: issuesResponse,
        },
      }));

      const res = await service.getIssues('Test title');

      expect(res).toEqual([
        {
          id: '10267',
          key: 'RJ-107',
          title: 'Test title',
        },
      ]);
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          issues: issuesResponse,
        },
      }));

      await service.getIssues('Test title');
      expect(requestMock).toHaveBeenLastCalledWith({
        axios,
        logger,
        method: 'get',
        configurationUtilities,
        url: `https://siem-kibana.atlassian.net/rest/api/2/search?jql=project%3D%22CK%22%20and%20summary%20~%22Test%20title%22`,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { issuetypes: 'Could not get issue types' } } };
        throw error;
      });

      await expect(service.getIssues('Test title')).rejects.toThrow(
        '[Action][Jira]: Unable to get issues. Error: An error has occurred. Reason: Could not get issue types'
      );
    });
  });

  describe('getIssue', () => {
    test('it should return a single issue', async () => {
      requestMock.mockImplementation(() => ({
        data: issueResponse,
      }));

      const res = await service.getIssue('RJ-107');

      expect(res).toEqual({
        id: '10267',
        key: 'RJ-107',
        title: 'Test title',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          issues: issuesResponse,
        },
      }));

      await service.getIssue('RJ-107');
      expect(requestMock).toHaveBeenLastCalledWith({
        axios,
        logger,
        method: 'get',
        configurationUtilities,
        url: `https://siem-kibana.atlassian.net/rest/api/2/issue/RJ-107`,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { issuetypes: 'Could not get issue types' } } };
        throw error;
      });

      await expect(service.getIssue('RJ-107')).rejects.toThrow(
        '[Action][Jira]: Unable to get issue with id RJ-107. Error: An error has occurred. Reason: Could not get issue types'
      );
    });
  });

  describe('getFields', () => {
    const callMocks = () => {
      requestMock
        .mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }))
        .mockImplementationOnce(() => ({
          data: {
            values: issueTypesResponse.data.projects[0].issuetypes,
          },
        }))
        .mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }))
        .mockImplementationOnce(() => ({
          data: {
            capabilities: {
              'list-project-issuetypes':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-project-issuetypes',
              'list-issuetype-fields':
                'https://siem-kibana.atlassian.net/rest/capabilities/list-issuetype-fields',
            },
          },
        }))
        .mockImplementationOnce(() => ({
          data: {
            values: [
              { required: true, schema: { type: 'string' }, fieldId: 'summary' },
              { required: true, schema: { type: 'string' }, fieldId: 'description' },
              {
                required: false,
                schema: { type: 'string' },
                fieldId: 'priority',
                allowedValues: [
                  {
                    name: 'Medium',
                    id: '3',
                  },
                ],
                defaultValue: {
                  name: 'Medium',
                  id: '3',
                },
              },
            ],
          },
        }))
        .mockImplementationOnce(() => ({
          data: {
            values: [
              { required: true, schema: { type: 'string' }, fieldId: 'summary' },
              { required: true, schema: { type: 'string' }, fieldId: 'description' },
            ],
          },
        }));
    };
    beforeEach(() => {
      jest.resetAllMocks();
    });
    test('it should call request with correct arguments', async () => {
      callMocks();
      await service.getFields();
      const callUrls = [
        'https://siem-kibana.atlassian.net/rest/capabilities',
        'https://siem-kibana.atlassian.net/rest/api/2/issue/createmeta/CK/issuetypes',
        'https://siem-kibana.atlassian.net/rest/capabilities',
        'https://siem-kibana.atlassian.net/rest/capabilities',
        'https://siem-kibana.atlassian.net/rest/api/2/issue/createmeta/CK/issuetypes/10006',
        'https://siem-kibana.atlassian.net/rest/api/2/issue/createmeta/CK/issuetypes/10007',
      ];
      requestMock.mock.calls.forEach((call, i) => {
        expect(call[0].url).toEqual(callUrls[i]);
      });
    });
    test('it returns common fields correctly', async () => {
      callMocks();
      const res = await service.getFields();
      expect(res).toEqual({
        description: {
          allowedValues: [],
          defaultValue: {},
          required: true,
          schema: { type: 'string' },
        },
        summary: {
          allowedValues: [],
          defaultValue: {},
          required: true,
          schema: { type: 'string' },
        },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        const error: ResponseError = new Error('An error has occurred');
        error.response = { data: { errors: { summary: 'Required field' } } };
        throw error;
      });
      await expect(service.getFields()).rejects.toThrow(
        '[Action][Jira]: Unable to get capabilities. Error: An error has occurred. Reason: Required field'
      );
    });
  });
});
