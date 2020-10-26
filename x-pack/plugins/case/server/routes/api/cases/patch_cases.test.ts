/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import { ConnectorTypes } from '../../../../common/api';
import { CaseClient } from '../../../client';
import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCases,
} from '../__fixtures__';
import { initPatchCasesApi } from './patch_cases';

describe('PATCH cases', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPatchCasesApi, 'patch');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
    }));
  });

  it(`it updates a new case`, async () => {
    const patchResult = [
      {
        closed_at: '2019-11-25T21:54:48.952Z',
        closed_by: { email: 'd00d@awesome.com', full_name: 'Awesome D00d', username: 'awesome' },
        comments: [],
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: { email: 'testemail@elastic.co', full_name: 'elastic', username: 'elastic' },
        description: 'This is a brand new case of a bad meanie defacing data',
        id: 'mock-id-1',
        external_service: null,
        status: 'closed' as const,
        tags: ['defacement'],
        title: 'Super Bad Security Issue',
        totalComment: 0,
        updated_at: '2019-11-25T21:54:48.952Z',
        updated_by: { email: 'd00d@awesome.com', full_name: 'Awesome D00d', username: 'awesome' },
        version: 'WzE3LDFd',
      },
    ];

    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases',
      method: 'patch',
      body: {
        cases: [
          {
            id: 'mock-id-1',
            status: 'closed' as const,
            version: 'WzAsMV0=',
          },
        ],
      },
    });

    const context = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const caseClient = context.case!.getCaseClient() as jest.Mocked<CaseClient>;
    caseClient.update.mockResolvedValueOnce(patchResult);
    const response = await routeHandler(context, request, kibanaResponseFactory);

    expect(caseClient.update).toHaveBeenCalledTimes(1);
    expect(caseClient.update).toHaveBeenCalledWith({ cases: request.body });
    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(patchResult);
  });
});
