/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { createCaseClient } from '.';
import {
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

const caseService = createCaseServiceMock();
const caseConfigureService = createConfigureServiceMock();
const userActionService = createUserActionServiceMock();
const alertsService = createAlertServiceMock();
const savedObjectsClient = savedObjectsClientMock.create();
const request = {} as KibanaRequest;
const context = {} as RequestHandlerContext;

const createMock = create as jest.Mock;
const updateMock = update as jest.Mock;
const addCommentMock = addComment as jest.Mock;
const updateAlertsStatusMock = updateAlertsStatus as jest.Mock;

describe('createCaseClient()', () => {
  test('it creates the client correctly', async () => {
    createCaseClient({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    });

    expect(createMock).toHaveBeenCalledWith({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    });

    expect(updateMock).toHaveBeenCalledWith({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    });

    expect(addCommentMock).toHaveBeenCalledWith({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    });

    expect(updateAlertsStatusMock).toHaveBeenCalledWith({
      savedObjectsClient,
      request,
      caseConfigureService,
      caseService,
      userActionService,
      alertsService,
      context,
    });
  });
});
