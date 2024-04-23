/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { TLSRuleExecutor } from './tls_rule_executor';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsService } from '../../synthetics_service/synthetics_service';
import * as monitorUtils from '../../saved_objects/synthetics_monitor/get_all_monitors';
import * as locationsUtils from '../../synthetics_service/get_all_locations';
import type { PublicLocation } from '../../../common/runtime_types';
import { SyntheticsServerSetup } from '../../types';

describe('tlsRuleExecutor', () => {
  const mockEsClient = elasticsearchClientMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const soClient = savedObjectsClientMock.create();
  jest.spyOn(locationsUtils, 'getAllLocations').mockResolvedValue({
    // @ts-ignore
    publicLocations: [
      {
        id: 'us_central_qa',
        label: 'US Central QA',
      },
      {
        id: 'us_central_dev',
        label: 'US Central DEV',
      },
    ] as unknown as PublicLocation,
    privateLocations: [],
  });

  const serverMock: SyntheticsServerSetup = {
    logger,
    uptimeEsClient: mockEsClient,
    authSavedObjectsClient: soClient,
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('test-space'),
      },
    },
    encryptedSavedObjects: mockEncryptedSO(),
  } as unknown as SyntheticsServerSetup;

  const syntheticsService = new SyntheticsService(serverMock);

  const monitorClient = new SyntheticsMonitorClient(syntheticsService, serverMock);

  it('should only query enabled monitors', async () => {
    const spy = jest.spyOn(monitorUtils, 'getAllMonitors').mockResolvedValue([]);
    const tlsRule = new TLSRuleExecutor(
      moment().toDate(),
      {},
      soClient,
      mockEsClient,
      serverMock,
      monitorClient
    );

    const { certs } = await tlsRule.getExpiredCertificates();

    expect(certs).toEqual([]);

    expect(spy).toHaveBeenCalledWith({
      filter:
        'synthetics-monitor.attributes.alert.tls.enabled: true and (synthetics-monitor.attributes.type: http or synthetics-monitor.attributes.type: tcp)',
      soClient,
    });
  });
});
