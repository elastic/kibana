/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { createExternalService } from './service';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import { ExternalServiceITOM } from '../lib/servicenow/types';
import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { snExternalServiceConfig } from '../lib/servicenow/config';
import { itomEventParams, serviceNowChoices } from '../lib/servicenow/mocks';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

jest.mock('axios');
jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
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
  let connectorUsageCollector: ConnectorUsageCollector;

  beforeEach(() => {
    connectorUsageCollector = new ConnectorUsageCollector({
      logger,
      connectorId: 'test-connector-id',
    });
    service = createExternalService({
      credentials: {
        config: { apiUrl: 'https://example.com/', isOAuth: false },
        secrets: { username: 'admin', password: 'admin' },
      },
      logger,
      configurationUtilities,
      serviceConfig: snExternalServiceConfig['.servicenow-itom'],
      axiosInstance: axios,
      connectorUsageCollector,
    }) as ExternalServiceITOM;
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
        connectorUsageCollector,
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
        connectorUsageCollector,
      });
    });
  });
});
