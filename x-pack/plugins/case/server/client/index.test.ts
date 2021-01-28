/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import {
  connectorMappingsServiceMock,
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
  createAlertServiceMock,
} from '../services/mocks';

jest.mock('./client');
import { CaseClientImpl } from './client';
import { createExternalCaseClient } from './index';

const caseConfigureService = createConfigureServiceMock();
const alertsService = createAlertServiceMock();
const caseService = createCaseServiceMock();
const connectorMappingsService = connectorMappingsServiceMock();
const request = {} as KibanaRequest;
const savedObjectsClient = savedObjectsClientMock.create();
const userActionService = createUserActionServiceMock();

describe('createExternalCaseClient()', () => {
  test('it creates the client correctly', async () => {
    createExternalCaseClient({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    });
    expect(CaseClientImpl).toHaveBeenCalledTimes(1);
  });
});
