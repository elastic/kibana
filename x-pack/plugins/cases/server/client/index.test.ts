/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '../../../../../src/core/server/mocks';
import { nullUser } from '../common';
import {
  connectorMappingsServiceMock,
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
  createAlertServiceMock,
} from '../services/mocks';

jest.mock('./client');
import { CasesClientHandler } from './client';
import { createExternalCasesClient } from './index';

const logger = loggingSystemMock.create().get('case');
const esClient = elasticsearchServiceMock.createElasticsearchClient();
const caseConfigureService = createConfigureServiceMock();
const alertsService = createAlertServiceMock();
const caseService = createCaseServiceMock();
const connectorMappingsService = connectorMappingsServiceMock();
const savedObjectsClient = savedObjectsClientMock.create();
const userActionService = createUserActionServiceMock();

describe('createExternalCasesClient()', () => {
  test('it creates the client correctly', async () => {
    createExternalCasesClient({
      scopedClusterClient: esClient,
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      user: nullUser,
      savedObjectsClient,
      userActionService,
      logger,
    });
    expect(CasesClientHandler).toHaveBeenCalledTimes(1);
  });
});
