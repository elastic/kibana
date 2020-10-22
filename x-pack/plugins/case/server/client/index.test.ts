/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { createCaseClient } from '.';
import {
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
} from '../services/mocks';

import { create } from './cases/create';
import { update } from './cases/update';
import { addComment } from './comments/add_comment';

jest.mock('./cases/create');
jest.mock('./cases/update');
jest.mock('./comments/add_comment');

const caseService = createCaseServiceMock();
const caseConfigureService = createConfigureServiceMock();
const userActionService = createUserActionServiceMock();
const savedObjectsClient = savedObjectsClientMock.create();

const createMock = create as jest.Mock;
const updateMock = update as jest.Mock;
const addCommentMock = addComment as jest.Mock;

describe('createCaseClient()', () => {
  test('it creates the client correctly', async () => {
    createCaseClient({
      savedObjectsClient,
      caseConfigureService,
      caseService,
      userActionService,
    });

    expect(createMock).toHaveBeenCalledWith({
      savedObjectsClient,
      caseConfigureService,
      caseService,
      userActionService,
    });

    expect(updateMock).toHaveBeenCalledWith({
      savedObjectsClient,
      caseConfigureService,
      caseService,
      userActionService,
    });

    expect(addCommentMock).toHaveBeenCalledWith({
      savedObjectsClient,
      caseConfigureService,
      caseService,
      userActionService,
    });
  });
});
