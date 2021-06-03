/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { Logger } from '../../../../../../src/core/server';
import { actionsConfigMock } from '../../actions_config.mock';
import * as utils from '../lib/axios_utils';
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
const requestMock = utils.request as jest.Mock;
const configurationUtilities = actionsConfigMock.create();

describe('Swimlane Service', () => {
  let service: ExternalService;
  const config = {
    apiUrl: 'https://test.swimlane.com/',
    appId: 'bcq16kdTbz5jlwM6h',
    connectorType: 'all',
    mappings,
  };

  const headers = {
    'Content-Type': 'application/json',
    'Private-Token': 'token',
  };

  const incident = {
    ruleName: 'Rule Name',
    alertSource: 'Alert Source',
    caseId: 'Case Id',
    caseName: 'Case Name',
    comments: 'Comments',
    severity: 'Severity',
    externalId: null,
    description: 'Description',
    alertId: 'Alert Id',
  };

  beforeAll(() => {
    service = createExternalService(
      {
        // The trailing slash at the end of the url is intended.
        // All API calls need to have the trailing slash removed.
        config,
        secrets: { apiToken: 'token' },
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
            secrets: { apiToken: '121212' },
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
            secrets: { apiToken: 'token' },
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
            secrets: { apiToken: 'token' },
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
      requestMock.mockImplementation(() => ({
        data,
      }));

      const res = await service.createRecord({
        incident,
      });

      expect(res).toEqual({
        id: '123',
        title: 'title',
        pushedDate: '2021-06-01T17:29:51.092Z',
        url: `${config.apiUrl.slice(0, -1)}/record/${config.appId}/123`,
      });
    });

    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data,
      }));

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
            [mappings.alertSourceConfig.id]: 'Alert Source',
            [mappings.caseNameConfig.id]: 'Case Name',
            [mappings.caseIdConfig.id]: 'Case Id',
            [mappings.commentsConfig.id]: 'Comments',
            [mappings.severityConfig.id]: 'Severity',
            [mappings.descriptionConfig.id]: 'Description',
            [mappings.alertIdConfig.id]: 'Alert Id',
          },
        },
        url: `${config.apiUrl.slice(0, -1)}/api/app/${config.appId}/record`,
        method: 'post',
        configurationUtilities,
      });
    });

    test('it should throw an error', async () => {
      requestMock.mockImplementation(() => {
        throw new Error('An error has occurred');
      });

      await expect(service.createRecord({ incident })).rejects.toThrow(
        `[Action][Swimlane]: Unable to create record in application with id ${config.appId}. Error: An error has occurred`
      );
    });
  });

  // TODO: Implement
  describe('updateRecord', () => {});

  // TODO: Implement
  describe('createComment', () => {});
});
