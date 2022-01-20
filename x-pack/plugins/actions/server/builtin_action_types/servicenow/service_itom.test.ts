/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { createExternalServiceITOM } from './service_itom';
import * as utils from '../lib/axios_utils';
import { ExternalServiceITOM } from './types';
import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { snExternalServiceConfig } from './config';
import { itomEventParams, serviceNowChoices } from './mocks';

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

describe('ServiceNow SIR service', () => {
  let service: ExternalServiceITOM;

  beforeEach(() => {
    service = createExternalServiceITOM(
      {
        config: { apiUrl: 'https://example.com/' },
        secrets: { username: 'admin', password: 'admin' },
      },
      logger,
      configurationUtilities,
      snExternalServiceConfig['.servicenow-itom']
    ) as ExternalServiceITOM;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addEvent', () => {
    test('it adds an event', async () => {
      requestMock.mockImplementationOnce(() => ({
        data: {
          result: {
            'Default Bulk Endpoint': '1 events were inserted',
          },
        },
      }));

      await service.addEvent(itomEventParams);
      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://example.com/api/global/em/jsonv2',
        method: 'post',
        data: { records: [itomEventParams] },
      });
    });
  });

  describe('getChoices', () => {
    test('it should call request with correct arguments', async () => {
      requestMock.mockImplementation(() => ({
        data: { result: serviceNowChoices },
      }));
      await service.getChoices(['severity']);

      expect(requestMock).toHaveBeenCalledWith({
        axios,
        logger,
        configurationUtilities,
        url: 'https://example.com/api/now/table/sys_choice?sysparm_query=name=task^ORname=em_event^element=severity^language=en&sysparm_fields=label,value,dependent_value,element',
      });
    });
  });
});
