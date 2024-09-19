/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { createExternalService, getValueTextContent, formatUpdateRequest } from './service';
import * as utils from '../lib/axios_utils';
import { ExternalService } from './types';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { incidentTypes, resilientFields, severity } from './mocks';
import { actionsConfigMock } from '../../actions_config.mock';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

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
const now = Date.now;
const TIMESTAMP = 1589391874472;
const configurationUtilities = actionsConfigMock.create();

// Incident update makes three calls to the API.
// The function below mocks this calls.
// a) Get the latest incident
// b) Update the incident
// c) Get the updated incident
const mockIncidentUpdate = (withUpdateError = false) => {
  requestMock.mockImplementationOnce(() => ({
    data: {
      id: '1',
      name: 'title',
      description: {
        format: 'html',
        content: 'description',
      },
      incident_type_ids: [1001, 16, 12],
      severity_code: 6,
    },
  }));

  if (withUpdateError) {
    requestMock.mockImplementationOnce(() => {
      throw new Error('An error has occurred');
    });
  } else {
    requestMock.mockImplementationOnce(() => ({
      data: {
        success: true,
        id: '1',
        inc_last_modified_date: 1589391874472,
      },
    }));
  }

  requestMock.mockImplementationOnce(() => ({
    data: {
      id: '1',
      name: 'title_updated',
      description: {
        format: 'html',
        content: 'desc_updated',
      },
      inc_last_modified_date: 1589391874472,
    },
  }));
};

describe('IBM Resilient service', () => {
  let service: ExternalService;

  beforeAll(() => {
    service = createExternalService(
      {
        // The trailing slash at the end of the url is intended.
        // All API calls need to have the trailing slash removed.
        config: { apiUrl: 'https://resilient.elastic.co/', orgId: '201' },
        secrets: { apiKeyId: 'keyId', apiKeySecret: 'secret' },
      },
      logger,
      configurationUtilities
    );
  });

  afterAll(() => {
    Date.now = now;
  });

  beforeEach(() => {
    jest.resetAllMocks();
    Date.now = jest.fn().mockReturnValue(TIMESTAMP);
  });

  describe('getValueTextContent', () => {
    test('transforms correctly', () => {
      expect(getValueTextContent('name', 'title')).toEqual({
        text: 'title',
      });
    });

    test('transforms correctly the description', () => {
      expect(getValueTextContent('description', 'desc')).toEqual({
        textarea: {
          format: 'html',
          content: 'desc',
        },
      });
    });
  });

  describe('formatUpdateRequest', () => {
    test('transforms correctly', () => {
      const oldIncident = { name: 'title', description: 'desc' };
      const newIncident = { name: 'title_updated', description: 'desc_updated' };
      expect(formatUpdateRequest({ oldIncident, newIncident })).toEqual({
        changes: [
          {
            field: { name: 'name' },
            old_value: { text: 'title' },
            new_value: { text: 'title_updated' },
          },
          {
            field: { name: 'description' },
            old_value: {
              textarea: {
                format: 'html',
                content: 'desc',
              },
            },
            new_value: {
              textarea: {
                format: 'html',
                content: 'desc_updated',
              },
            },
          },
        ],
      });
    });
  });

  describe('createExternalService', () => {
    test('throws without url', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: null, orgId: '201' },
            secrets: { apiKeyId: 'token', apiKeySecret: 'secret' },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without orgId', () => {
      expect(() =>
        createExternalService(
          {
            config: { apiUrl: 'test.com', orgId: null },
            secrets: { apiKeyId: 'token', apiKeySecret: 'secret' },
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
            config: { apiUrl: 'test.com', orgId: '201' },
            secrets: { apiKeyId: '', apiKeySecret: 'secret' },
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
            config: { apiUrl: 'test.com', orgId: '201' },
            secrets: { apiKeyId: '', apiKeySecret: undefined },
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
        data: {
          id: '1',
          name: '1',
          description: {
            format: 'html',
            content: 'description',
          },
        },
      }));
      const res = await service.getIncident('1');
      expect(res).toEqual({ id: '1', name: '1', description: 'description' });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { id: '1' },
      }));

      await service.getIncident('1');
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        url: 'https://resilient.elastic.co/rest/orgs/201/incidents/1',
        params: {
          text_content_output_format: 'objects_convert',
        },
        configurationUtilities,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      await expect(service.getIncident('1')).rejects.toThrow(
        'Unable to get incident with id 1. Error: An error has occurred'
      );
    });
  });

  describe('createIncident', () => {
    test('it creates the incident correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          name: 'title',
          description: 'description',
          discovered_date: 1589391874472,
          create_date: 1589391874472,
        },
      }));

      const res = await service.createIncident({
        incident: {
          name: 'title',
          description: 'desc',
          incidentTypes: [1001],
          severityCode: 6,
        },
      });

      expect(res).toEqual({
        title: '1',
        id: '1',
        pushedDate: '2020-05-13T17:44:34.472Z',
        url: 'https://resilient.elastic.co/#incidents/1',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          name: 'title',
          description: 'description',
          discovered_date: 1589391874472,
          create_date: 1589391874472,
        },
      }));

      await service.createIncident({
        incident: {
          name: 'title',
          description: 'desc',
          incidentTypes: [1001],
          severityCode: 6,
        },
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        url: 'https://resilient.elastic.co/rest/orgs/201/incidents?text_content_output_format=objects_convert',
        logger,
        method: 'post',
        configurationUtilities,
        data: {
          name: 'title',
          description: {
            format: 'html',
            content: 'desc',
          },
          discovered_date: TIMESTAMP,
          incident_type_ids: [{ id: 1001 }],
          severity_code: { id: 6 },
        },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(
        service.createIncident({
          incident: {
            name: 'title',
            description: 'desc',
            incidentTypes: [1001],
            severityCode: 6,
          },
        })
      ).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to create incident. Error: An error has occurred'
      );
    });
  });

  describe('updateIncident', () => {
    test('it updates the incident correctly', async () => {
      mockIncidentUpdate();
      const res = await service.updateIncident({
        incidentId: '1',
        incident: {
          name: 'title',
          description: 'desc',
          incidentTypes: [1001],
          severityCode: 6,
        },
      });

      expect(res).toEqual({
        title: '1',
        id: '1',
        pushedDate: '2020-05-13T17:44:34.472Z',
        url: 'https://resilient.elastic.co/#incidents/1',
      });
    });

    test('it should call request with correct arguments', async () => {
      mockIncidentUpdate();

      await service.updateIncident({
        incidentId: '1',
        incident: {
          name: 'title_updated',
          description: 'desc_updated',
          incidentTypes: [1001],
          severityCode: 5,
        },
      });

      // Incident update makes three calls to the API.
      // The second call to the API is the update call.
      expect(requestMock.mock.calls[1][0]).toEqual({
        axios,
        logger,
        method: 'patch',
        configurationUtilities,
        url: 'https://resilient.elastic.co/rest/orgs/201/incidents/1',
        data: {
          changes: [
            {
              field: { name: 'name' },
              old_value: { text: 'title' },
              new_value: { text: 'title_updated' },
            },
            {
              field: { name: 'description' },
              old_value: {
                textarea: {
                  content: 'description',
                  format: 'html',
                },
              },
              new_value: {
                textarea: {
                  content: 'desc_updated',
                  format: 'html',
                },
              },
            },
            {
              field: {
                name: 'incident_type_ids',
              },
              old_value: {
                ids: [1001, 16, 12],
              },
              new_value: {
                ids: [1001],
              },
            },
            {
              field: {
                name: 'severity_code',
              },
              old_value: {
                id: 6,
              },
              new_value: {
                id: 5,
              },
            },
          ],
        },
      });
    });

    test('it should throw an error', async () => {
      mockIncidentUpdate(true);

      await expect(
        service.updateIncident({
          incidentId: '1',
          incident: {
            name: 'title',
            description: 'desc',
            incidentTypes: [1001],
            severityCode: 5,
          },
        })
      ).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to update incident with id 1. Error: An error has occurred'
      );
    });
  });

  describe('createComment', () => {
    test('it creates the comment correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          create_date: 1589391874472,
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
        pushedDate: '2020-05-13T17:44:34.472Z',
        externalCommentId: '1',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          id: '1',
          create_date: 1589391874472,
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
        url: 'https://resilient.elastic.co/rest/orgs/201/incidents/1/comments',
        data: {
          text: {
            content: 'comment',
            format: 'text',
          },
        },
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
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
        '[Action][IBM Resilient]: Unable to create comment at incident with id 1. Error: An error has occurred'
      );
    });
  });

  describe('getIncidentTypes', () => {
    test('it creates the incident correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          values: incidentTypes,
        },
      }));

      const res = await service.getIncidentTypes();

      expect(res).toEqual([
        { id: 17, name: 'Communication error (fax; email)' },
        { id: 1001, name: 'Custom type' },
      ]);
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(service.getIncidentTypes()).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to get incident types. Error: An error has occurred.'
      );
    });
  });

  describe('getSeverity', () => {
    test('it creates the incident correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: {
          values: severity,
        },
      }));

      const res = await service.getSeverity();

      expect(res).toEqual([
        {
          id: 4,
          name: 'Low',
        },
        {
          id: 5,
          name: 'Medium',
        },
        {
          id: 6,
          name: 'High',
        },
      ]);
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(service.getIncidentTypes()).rejects.toThrow(
        '[Action][IBM Resilient]: Unable to get incident types. Error: An error has occurred.'
      );
    });
  });

  describe('getFields', () => {
    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: resilientFields,
      }));
      await service.getFields();

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://resilient.elastic.co/rest/orgs/201/types/incident/fields',
      });
    });
    test('it returns common fields correctly', async () => {
      requestMock.mockImplementation(() => ({
        data: resilientFields,
      }));
      const res = await service.getFields();
      expect(res).toEqual(resilientFields);
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });
      await expect(service.getFields()).rejects.toThrow(
        'Unable to get fields. Error: An error has occurred'
      );
    });
  });
});
