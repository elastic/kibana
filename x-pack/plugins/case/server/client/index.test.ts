/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { createCaseClient } from '.';
import {
  connectorMappingsServiceMock,
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
} from '../services/mocks';

import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add';

jest.mock('./cases/create');
jest.mock('./cases/update');
jest.mock('./comments/add');

const caseConfigureService = createConfigureServiceMock();
const caseService = createCaseServiceMock();
const connectorMappingsService = connectorMappingsServiceMock();
const request = {} as KibanaRequest;
const savedObjectsClient = savedObjectsClientMock.create();
const userActionService = createUserActionServiceMock();

const createMock = create as jest.Mock;
const updateMock = update as jest.Mock;
const addCommentMock = addComment as jest.Mock;

describe('createCaseClient()', () => {
  test('it creates the client correctly', async () => {
    createCaseClient({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    });

    expect(createMock).toHaveBeenCalledWith({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    });

    expect(updateMock).toHaveBeenCalledWith({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    });

    expect(addCommentMock).toHaveBeenCalledWith({
      caseConfigureService,
      caseService,
      connectorMappingsService,
      request,
      savedObjectsClient,
      userActionService,
    });
  });
});
