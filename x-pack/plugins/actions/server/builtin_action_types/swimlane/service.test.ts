/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Logger } from '@kbn/core/server';
import { actionsConfigMock } from '../../actions_config.mock';
import { request, createAxiosResponse } from '../lib/axios_utils';
import { createExternalService } from './service';
import { mappings } from './mocks';
import { ExternalService } from './types';

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
const requestMock = request as jest.Mock;
const configurationUtilities = actionsConfigMock.create();

describe('Swimlane Service', () => {
  let service: ExternalService;
  const config = {
    apiUrl: 'https://test.swimlane.com/',
    appId: 'bcq16kdTbz5jlwM6h',
    connectorType: 'all' as const,
    mappings,
  };
  const apiToken = 'token';

  const headers = {
    'Content-Type': 'application/json',
    'Private-Token': apiToken,
  };

  const incident = {
    ruleName: 'Rule Name',
    caseId: 'Case Id',
    caseName: 'Case Name',
    severity: 'Severity',
    externalId: null,
    description: 'Description',
    alertId: 'Alert Id',
  };

  const url = config.apiUrl.slice(0, -1);

  beforeAll(() => {
    service = createExternalService(
      {
        // The trailing slash at the end of the url is intended.
        // All API calls need to have the trailing slash removed.
        config,
        secrets: { apiToken },
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
            config: {
              // @ts-ignore
              apiUrl: null,
              appId: '99999',
              mappings,
            },
            secrets: { apiToken },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without app id', () => {
      expect(() =>
        createExternalService(
          {
            config: {
              apiUrl: 'test.com',
              // @ts-ignore
              appId: null,
            },
            secrets: { apiToken },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without mappings', () => {
      expect(() =>
        createExternalService(
          {
            config: {
              apiUrl: 'test.com',
              appId: '987987',
              // @ts-ignore
              mappings: null,
            },
            secrets: { apiToken },
          },
          logger,
          configurationUtilities
        )
      ).toThrow();
    });

    test('throws without api token', () => {
      expect(() => {
        return createExternalService(
          {
            config: { apiUrl: 'test.com', appId: '78978', mappings, connectorType: 'all' },
            secrets: {
              // @ts-ignore
              apiToken: null,
            },
          },
          logger,
          configurationUtilities
        );
      }).toThrow();
    });
  });

  describe('createRecord', () => {
    const data = {
      id: '123',
      name: 'title',
      createdDate: '2021-06-01T17:29:51.092Z',
    };

    test('it creates a record correctly', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data }));

      const res = await service.createRecord({
        incident,
      });

      expect(res).toEqual({
        id: '123',
        title: 'title',
        pushedDate: '2021-06-01T17:29:51.092Z',
        url: `${url}/record/${config.appId}/123`,
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data }));

      await service.createRecord({
        incident,
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        headers,
        data: {
          applicationId: config.appId,
          values: {
            [mappings.ruleNameConfig.id]: 'Rule Name',
            [mappings.caseNameConfig.id]: 'Case Name',
            [mappings.caseIdConfig.id]: 'Case Id',
            [mappings.severityConfig.id]: 'Severity',
            [mappings.descriptionConfig.id]: 'Description',
            [mappings.alertIdConfig.id]: 'Alert Id',
          },
        },
        url: `${url}/api/app/${config.appId}/record`,
        method: 'post',
        configurationUtilities,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(service.createRecord({ incident })).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 500. Error: An error has occurred. Reason: unknown`
      );
    });

    test('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.createRecord({ incident })).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 500. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json. Reason: unknown`
      );
    });

    test('it should throw if the required attributes are not there', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data: { notRequired: 'test' } }));

      await expect(service.createRecord({ incident })).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 500. Error: Response is missing at least one of the expected fields: id,name,createdDate. Reason: unknown`
      );
    });
  });

  describe('updateRecord', () => {
    const data = {
      id: '123',
      name: 'title',
      modifiedDate: '2021-06-01T17:29:51.092Z',
    };
    const incidentId = '123';

    test('it updates a record correctly', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data }));

      const res = await service.updateRecord({
        incident,
        incidentId,
      });

      expect(res).toEqual({
        id: '123',
        title: 'title',
        pushedDate: '2021-06-01T17:29:51.092Z',
        url: `${url}/record/${config.appId}/123`,
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data }));

      await service.updateRecord({
        incident,
        incidentId,
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        headers,
        data: {
          applicationId: config.appId,
          id: incidentId,
          values: {
            [mappings.ruleNameConfig.id]: 'Rule Name',
            [mappings.caseNameConfig.id]: 'Case Name',
            [mappings.caseIdConfig.id]: 'Case Id',
            [mappings.severityConfig.id]: 'Severity',
            [mappings.descriptionConfig.id]: 'Description',
            [mappings.alertIdConfig.id]: 'Alert Id',
          },
        },
        url: `${url}/api/app/${config.appId}/record/${incidentId}`,
        method: 'patch',
        configurationUtilities,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(service.updateRecord({ incident, incidentId })).rejects.toThrow(
        `[Action][Swimlane]: Unable to update record in application with id ${config.appId}. Status: 500. Error: An error has occurred. Reason: unknown`
      );
    });

    test('it should throw if the request is not a JSON', async () => {
      requestMock.mockImplementation(() =>
        createAxiosResponse({ data, headers: { ['content-type']: 'text/html' } })
      );

      await expect(service.updateRecord({ incident, incidentId })).rejects.toThrow(
        `[Action][Swimlane]: Unable to update record in application with id ${config.appId}. Status: 500. Error: Unsupported content type: text/html in GET https://example.com. Supported content types: application/json. Reason: unknown`
      );
    });

    test('it should throw if the required attributes are not there', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data: { notRequired: 'test' } }));

      await expect(service.updateRecord({ incident, incidentId })).rejects.toThrow(
        `[Action][Swimlane]: Unable to update record in application with id ${config.appId}. Status: 500. Error: Response is missing at least one of the expected fields: id,name,modifiedDate. Reason: unknown`
      );
    });
  });

  describe('createComment', () => {
    const data = {
      id: '123',
      name: 'title',
      modifiedDate: '2021-06-01T17:29:51.092Z',
    };
    const incidentId = '123';
    const comment = { commentId: '456', comment: 'A comment' };
    const createdDate = '2021-06-01T17:29:51.092Z';

    test('it updates a record correctly', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data }));

      const res = await service.createComment({
        comment,
        incidentId,
        createdDate,
      });

      expect(res).toEqual({
        commentId: '456',
        pushedDate: '2021-06-01T17:29:51.092Z',
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => createAxiosResponse({ data }));

      await service.createComment({
        comment,
        incidentId,
        createdDate,
      });

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        headers,
        data: {
          createdDate,
          fieldId: mappings.commentsConfig.id,
          isRichText: true,
          message: comment.comment,
        },
        url: `${url}/api/app/${config.appId}/record/${incidentId}/${mappings.commentsConfig.id}/comment`,
        method: 'post',
        configurationUtilities,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(service.createComment({ comment, incidentId, createdDate })).rejects.toThrow(
        `[Action][Swimlane]: Unable to create comment in application with id ${config.appId}. Status: 500. Error: An error has occurred. Reason: unknown`
      );
    });
  });

  describe('error messages', () => {
    const errorResponse = { ErrorCode: '1', Argument: 'Invalid field' };

    test('it contains the response error', async () => {
      requestMock.mockImplementation(() => {
        const error = new Error('An error has occurred');
        // @ts-ignore
        error.response = { data: errorResponse };
        throw error;
      });

      await expect(
        service.createRecord({
          incident,
        })
      ).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 500. Error: An error has occurred. Reason: Invalid field (1)`
      );
    });

    test('it shows an empty string for reason if the ErrorCode is undefined', async () => {
      requestMock.mockImplementation(() => {
        const error = new Error('An error has occurred');
        // @ts-ignore
        error.response = { data: { ErrorCode: '1' } };
        throw error;
      });

      await expect(
        service.createRecord({
          incident,
        })
      ).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 500. Error: An error has occurred. Reason: unknown`
      );
    });

    test('it shows an empty string for reason if the Argument is undefined', async () => {
      requestMock.mockImplementation(() => {
        const error = new Error('An error has occurred');
        // @ts-ignore
        error.response = { data: { Argument: 'Invalid field' } };
        throw error;
      });

      await expect(
        service.createRecord({
          incident,
        })
      ).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 500. Error: An error has occurred. Reason: unknown`
      );
    });

    test('it shows an empty string for reason if data is undefined', async () => {
      requestMock.mockImplementation(() => {
        const error = new Error('An error has occurred');
        // @ts-ignore
        error.response = {};
        throw error;
      });

      await expect(
        service.createRecord({
          incident,
        })
      ).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 500. Error: An error has occurred. Reason: unknown`
      );
    });

    test('it shows the status code', async () => {
      requestMock.mockImplementation(() => {
        const error = new Error('An error has occurred');
        // @ts-ignore
        error.response = { data: errorResponse, status: 400 };
        throw error;
      });

      await expect(
        service.createRecord({
          incident,
        })
      ).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Status: 400. Error: An error has occurred. Reason: Invalid field (1)`
      );
    });
  });
});
