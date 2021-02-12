/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, kibanaResponseFactory } from '../../../../../src/core/server';
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
import { get } from './cases/get';
import { update } from './cases/update';
import { push } from './cases/push';
import { addComment } from './comments/add';
import { getFields } from './configure/get_fields';
import { getMappings } from './configure/get_mappings';
import { updateAlertsStatus } from './alerts/update_status';
import { get as getUserActions } from './user_actions/get';
import { get as getAlerts } from './alerts/get';
import type { CasesRequestHandlerContext } from '../types';

jest.mock('./cases/create');
jest.mock('./cases/update');
jest.mock('./cases/get');
jest.mock('./cases/push');
jest.mock('./comments/add');
jest.mock('./alerts/update_status');
jest.mock('./alerts/get');
jest.mock('./user_actions/get');
jest.mock('./configure/get_fields');
jest.mock('./configure/get_mappings');

const caseConfigureService = createConfigureServiceMock();
const alertsService = createAlertServiceMock();
const caseService = createCaseServiceMock();
const connectorMappingsService = connectorMappingsServiceMock();
const request = {} as KibanaRequest;
const response = kibanaResponseFactory;
const savedObjectsClient = savedObjectsClientMock.create();
const userActionService = createUserActionServiceMock();
const context = {} as CasesRequestHandlerContext;

const createMock = create as jest.Mock;
const getMock = get as jest.Mock;
const updateMock = update as jest.Mock;
const pushMock = push as jest.Mock;
const addCommentMock = addComment as jest.Mock;
const updateAlertsStatusMock = updateAlertsStatus as jest.Mock;
const getAlertsStatusMock = getAlerts as jest.Mock;
const getFieldsMock = getFields as jest.Mock;
const getMappingsMock = getMappings as jest.Mock;
const getUserActionsMock = getUserActions as jest.Mock;

describe('createCaseClient()', () => {
  test('it creates the client correctly', async () => {
    createCaseClient({
      alertsService,
      caseConfigureService,
      caseService,
      connectorMappingsService,
      context,
      request,
      response,
      savedObjectsClient,
      userActionService,
    });

    [
      createMock,
      getMock,
      updateMock,
      pushMock,
      addCommentMock,
      updateAlertsStatusMock,
      getAlertsStatusMock,
      getFieldsMock,
      getMappingsMock,
      getUserActionsMock,
    ].forEach((method) =>
      expect(method).toHaveBeenCalledWith({
        caseConfigureService,
        caseService,
        connectorMappingsService,
        request,
        response,
        savedObjectsClient,
        userActionService,
        alertsService,
        context,
      })
    );
  });
});
