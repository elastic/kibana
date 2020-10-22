/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { ConnectorTypes } from '../../../common/api';
import {
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';

import { create } from './create';
import { CaseClient } from '../types';
import { elasticUser, casePostResponse, postCase, caseConfigureResponse } from '../mocks';

const caseService = createCaseServiceMock();
const caseConfigureService = createConfigureServiceMock();
const userActionService = createUserActionServiceMock();
const savedObjectsClient = savedObjectsClientMock.create();
const request = {} as KibanaRequest;

describe('create()', () => {
  let createHandler: CaseClient['create'];

  beforeEach(() => {
    jest.resetAllMocks();
    caseService.getUser.mockResolvedValue(elasticUser);
    caseConfigureService.find.mockResolvedValue(caseConfigureResponse);
    caseService.postNewCase.mockResolvedValue(casePostResponse);

    createHandler = create({
      savedObjectsClient,
      caseService,
      caseConfigureService,
      userActionService,
    });
  });

  describe('happy path', () => {
    test('it creates the case correctly', async () => {
      const res = await createHandler({ request, theCase: postCase });
      expect(res).toEqual({
        id: 'mock-id-1',
        comments: [],
        totalComment: 0,
        closed_at: null,
        closed_by: null,
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: { full_name: 'elastic', email: 'testemail@elastic.co', username: 'elastic' },
        description: 'This is a brand new case of a bad meanie defacing data',
        external_service: null,
        title: 'Super Bad Security Issue',
        status: 'open',
        tags: ['defacement'],
        updated_at: null,
        updated_by: null,
        version: 'WzAsMV0=',
      });
    });

    test('it creates the case without connector in the configuration', async () => {
      caseConfigureService.find.mockResolvedValue({ ...caseConfigureResponse, saved_objects: [] });

      const res = await createHandler({ request, theCase: postCase });
      expect(res).toEqual({
        id: 'mock-id-1',
        comments: [],
        totalComment: 0,
        closed_at: null,
        closed_by: null,
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: { full_name: 'elastic', email: 'testemail@elastic.co', username: 'elastic' },
        description: 'This is a brand new case of a bad meanie defacing data',
        external_service: null,
        title: 'Super Bad Security Issue',
        status: 'open',
        tags: ['defacement'],
        updated_at: null,
        updated_by: null,
        version: 'WzAsMV0=',
      });
    });
  });

  describe('unhappy path', () => {
    test('it throws when missing title', async () => {
      expect.assertions(1);
      caseConfigureService.find.mockResolvedValue({ ...caseConfigureResponse, saved_objects: [] });
      createHandler({
        request,
        // @ts-expect-error
        theCase: {
          description: 'desc',
          tags: [],
          connector: postCase.connector,
        },
      }).catch((e) => expect(e).not.toBeNull());
    });

    test('it throws when missing description', async () => {
      expect.assertions(1);
      caseConfigureService.find.mockResolvedValue({ ...caseConfigureResponse, saved_objects: [] });
      createHandler({
        request,
        // @ts-expect-error
        theCase: {
          title: 'title',
          tags: [],
          connector: postCase.connector,
        },
      }).catch((e) => expect(e).not.toBeNull());
    });

    test('it throws when missing tags', async () => {
      expect.assertions(1);
      caseConfigureService.find.mockResolvedValue({ ...caseConfigureResponse, saved_objects: [] });
      createHandler({
        request,
        // @ts-expect-error
        theCase: {
          title: 'title',
          description: 'desc',
          connector: postCase.connector,
        },
      }).catch((e) => expect(e).not.toBeNull());
    });

    test('it throws when missing connector ', async () => {
      expect.assertions(1);
      caseConfigureService.find.mockResolvedValue({ ...caseConfigureResponse, saved_objects: [] });
      createHandler({
        request,
        // @ts-expect-error
        theCase: { title: 'a title', description: 'desc', tags: [] },
      }).catch((e) => expect(e).not.toBeNull());
    });

    test('it throws when connector missing the right fields', async () => {
      expect.assertions(1);
      caseConfigureService.find.mockResolvedValue({ ...caseConfigureResponse, saved_objects: [] });
      createHandler({
        request,
        theCase: {
          title: 'a title',
          description: 'desc',
          tags: [],
          connector: {
            id: 'jira',
            name: 'jira',
            type: ConnectorTypes.jira,
            // @ts-expect-error
            fields: {},
          },
        },
      }).catch((e) => expect(e).not.toBeNull());
    });
  });
});
