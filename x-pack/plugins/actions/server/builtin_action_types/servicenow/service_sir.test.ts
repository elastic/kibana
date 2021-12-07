/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { createExternalServiceSIR } from './service_sir';
import * as utils from '../lib/axios_utils';
import { ExternalServiceSIR } from './types';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { observables } from './mocks';
import { snExternalServiceConfig } from './config';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

jest.mock('axios');
jest.mock('../lib/axios_utils', () => {
  const originalUtils = jest.requireActual('../lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

axios.create = jest.fn(() => axios);
const requestMock = utils.request as jest.Mock;
const configurationUtilities = actionsConfigMock.create();

const mockApplicationVersion = () =>
  requestMock.mockImplementationOnce(() => ({
    data: {
      result: { name: 'Elastic', scope: 'x_elas2_sir_int', version: '1.0.0' },
    },
  }));

const getAddObservablesResponse = () => [
  {
    value: '5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9',
    observable_sys_id: '1',
  },
  {
    value: '127.0.0.1',
    observable_sys_id: '2',
  },
  {
    value: 'https://example.com',
    observable_sys_id: '3',
  },
];

const mockAddObservablesResponse = (single: boolean) => {
  const res = getAddObservablesResponse();
  requestMock.mockImplementation(() => ({
    data: {
      result: single ? res[0] : res,
    },
  }));
};

const expectAddObservables = (single: boolean) => {
  expect(requestMock).toHaveBeenNthCalledWith(1, {
    axios,
    logger,
    configurationUtilities,
    url: 'https://example.com/api/x_elas2_sir_int/elastic_api/health',
    method: 'get',
  });

  const url = single
    ? 'https://example.com/api/x_elas2_sir_int/elastic_api/incident/incident-1/observables'
    : 'https://example.com/api/x_elas2_sir_int/elastic_api/incident/incident-1/observables/bulk';

  const data = single ? observables[0] : observables;

  expect(requestMock).toHaveBeenNthCalledWith(2, {
    axios,
    logger,
    configurationUtilities,
    url,
    method: 'post',
    data,
  });
};

describe('ServiceNow SIR service', () => {
  let service: ExternalServiceSIR;

  beforeEach(() => {
    service = createExternalServiceSIR(
      {
        config: { apiUrl: 'https://example.com/' },
        secrets: { username: 'admin', password: 'admin' },
      },
      logger,
      configurationUtilities,
      snExternalServiceConfig['.servicenow-sir']
    ) as ExternalServiceSIR;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkAddObservableToIncident', () => {
    test('it adds multiple observables correctly', async () => {
      mockApplicationVersion();
      mockAddObservablesResponse(false);

      const res = await service.bulkAddObservableToIncident(observables, 'incident-1');
      expect(res).toEqual(getAddObservablesResponse());
      expectAddObservables(false);
    });

    test('it adds a single observable correctly', async () => {
      mockApplicationVersion();
      mockAddObservablesResponse(true);

      const res = await service.addObservableToIncident(observables[0], 'incident-1');
      expect(res).toEqual(getAddObservablesResponse()[0]);
      expectAddObservables(true);
    });
  });
});
