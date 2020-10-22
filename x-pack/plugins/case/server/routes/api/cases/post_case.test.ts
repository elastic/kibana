/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory, RequestHandler } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCases,
} from '../__fixtures__';
import { initPostCaseApi } from './post_case';
import { CASES_URL } from '../../../../common/constants';
import { ConnectorTypes } from '../../../../common/api/connectors';
import { CaseClient } from '../../../client';

describe('POST cases', () => {
  let routeHandler: RequestHandler<any, any, any>;
  beforeAll(async () => {
    routeHandler = await createRoute(initPostCaseApi, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2019-11-25T21:54:48.952Z'),
    }));
  });

  it(`it creates a new case`, async () => {
    const createResult = {
      id: 'mock-it',
      comments: [],
      totalComment: 0,
      closed_at: null,
      closed_by: null,
      connector: {
        id: 'none',
        name: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      created_at: '2019-11-25T21:54:48.952Z',
      created_by: { full_name: 'Awesome D00d', email: 'd00d@awesome.com', username: 'awesome' },
      description: 'This is a brand new case of a bad meanie defacing data',
      external_service: null,
      title: 'Super Bad Security Issue',
      status: 'open' as const,
      tags: ['defacement'],
      updated_at: null,
      updated_by: null,
      version: 'WzksMV0=',
    };

    const request = httpServerMock.createKibanaRequest({
      path: CASES_URL,
      method: 'post',
      body: {
        description: 'This is a brand new case of a bad meanie defacing data',
        title: 'Super Bad Security Issue',
        tags: ['defacement'],
        connector: {
          id: 'none',
          name: 'none',
          type: ConnectorTypes.none,
          fields: null,
        },
      },
    });

    const context = createRouteContext(
      createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
      })
    );

    const caseClient = context.case!.getCaseClient() as jest.Mocked<CaseClient>;
    caseClient.create.mockResolvedValueOnce(createResult);
    const response = await routeHandler(context, request, kibanaResponseFactory);

    expect(caseClient.create).toHaveBeenCalledTimes(1);
    expect(caseClient.create).toHaveBeenCalledWith({ request, theCase: request.body });
    expect(response.status).toEqual(200);
    expect(response.payload).toEqual(createResult);
  });
});
