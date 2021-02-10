/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, RequestHandlerContext } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { createCaseClient } from '.';
import {
  connectorMappingsServiceMock,
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
  createAlertServiceMock,
} from '../services/mocks';

import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add';
import { updateAlertsStatus } from './alerts/update_status';

jest.mock('./cases/create');
jest.mock('./cases/update');
jest.mock('./comments/add');
jest.mock('./alerts/update_status');

const caseConfigureService = createConfigureServiceMock();
const alertsService = createAlertServiceMock();
const caseService = createCaseServiceMock();
const connectorMappingsService = connectorMappingsServiceMock();
const request = {} as KibanaRequest;
const savedObjectsClient = savedObjectsClientMock.create();
const userActionService = createUserActionServiceMock();
const context = {} as RequestHandlerContext;

const createMock = create as jest.Mock;
const updateMock = update as jest.Mock;
const addCommentMock = addComment as jest.Mock;
const updateAlertsStatusMock = updateAlertsStatus as jest.Mock;

describe('createCaseClient()', () => {
  test('it creates the client correctly', async () => {
    createCaseClient({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      savedObjectsClient,
      userActionService,
    });

    expect(createMock).toHaveBeenCalledWith({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      savedObjectsClient,
      userActionService,
    });

    expect(updateMock).toHaveBeenCalledWith({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      savedObjectsClient,
      userActionService,
    });

    expect(addCommentMock).toHaveBeenCalledWith({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      savedObjectsClient,
      userActionService,
    });

    expect(updateAlertsStatusMock).toHaveBeenCalledWith({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      savedObjectsClient,
      userActionService,
    });
  });
});
