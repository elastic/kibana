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
import { createExternalService } from './service';

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
const configurationUtilities = actionsConfigMock.create();

const mappings = {
  alertSourceConfig: {
    id: 'adnjls',
    name: 'Alert Source',
    key: 'alert-source',
    fieldType: 'text',
  },
  severityConfig: {
    id: 'adnlas',
    name: 'Severity',
    key: 'severity',
    fieldType: 'text',
  },
  alertNameConfig: {
    id: 'adnfls',
    name: 'Alert Name',
    key: 'alert-name',
    fieldType: 'text',
  },
  caseIdConfig: {
    id: 'a6sst',
    name: 'Case Id',
    key: 'case-id-name',
    fieldType: 'text',
  },
  caseNameConfig: {
    id: 'a6fst',
    name: 'Case Name',
    key: 'case-name',
    fieldType: 'text',
  },
  commentsConfig: {
    id: 'a6fdf',
    name: 'Comments',
    key: 'comments',
    fieldType: 'text',
  },
};

describe('Swimlane Service', () => {
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
            config: { apiUrl: 'test.com', appId: '78978', mappings },
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
});
