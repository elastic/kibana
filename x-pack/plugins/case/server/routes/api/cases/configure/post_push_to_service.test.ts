/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, RequestHandler, RequestHandlerContext } from 'src/core/server';
import { httpServerMock } from 'src/core/server/mocks';

import {
  createMockSavedObjectsRepository,
  createRoute,
  createRouteContext,
  mockCaseMappings,
} from '../../__fixtures__';

import { initPostPushToService } from './post_push_to_service';
import { executePushResponse, newPostPushRequest } from '../../__mocks__/request_responses';
import { CASE_CONFIGURE_PUSH_URL } from '../../../../../common/constants';

describe('Post push to service', () => {
  let routeHandler: RequestHandler<any, any, any>;
  const req = httpServerMock.createKibanaRequest({
    path: `${CASE_CONFIGURE_PUSH_URL}`,
    method: 'post',
    params: {
      connector_id: '666',
    },
    body: newPostPushRequest,
  });
  let context: RequestHandlerContext;
  beforeAll(async () => {
    routeHandler = await createRoute(initPostPushToService, 'post');
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2020-04-09T09:43:51.778Z'),
    }));
    context = await createRouteContext(
      createMockSavedObjectsRepository({
        caseMappingsSavedObject: mockCaseMappings,
      })
    );
  });

  it('Happy path - posts success', async () => {
    const betterContext = ({
      ...context,
      actions: {
        ...context.actions,
        getActionsClient: () => {
          const actions = context!.actions!.getActionsClient();
          return {
            ...actions,
            execute: jest.fn().mockImplementation(({ actionId }) => {
              return {
                status: 'ok',
                data: {
                  title: 'RJ2-200',
                  id: '10663',
                  pushedDate: '2020-12-17T00:32:40.738Z',
                  url: 'https://siem-kibana.atlassian.net/browse/RJ2-200',
                  comments: [],
                },
                actionId,
              };
            }),
          };
        },
      },
    } as unknown) as RequestHandlerContext;

    const res = await routeHandler(betterContext, req, kibanaResponseFactory);

    expect(res.status).toEqual(200);
    expect(res.payload).toEqual({
      ...executePushResponse,
      actionId: '666',
    });
  });
  it('Unhappy path - context case missing', async () => {
    const betterContext = ({
      ...context,
      case: null,
    } as unknown) as RequestHandlerContext;

    const res = await routeHandler(betterContext, req, kibanaResponseFactory);
    expect(res.status).toEqual(400);
    expect(res.payload.isBoom).toBeTruthy();
    expect(res.payload.output.payload.message).toEqual(
      'RouteHandlerContext is not registered for cases'
    );
  });
  it('Unhappy path - context actions missing', async () => {
    const betterContext = ({
      ...context,
      actions: null,
    } as unknown) as RequestHandlerContext;

    const res = await routeHandler(betterContext, req, kibanaResponseFactory);
    expect(res.status).toEqual(404);
    expect(res.payload.isBoom).toBeTruthy();
    expect(res.payload.output.payload.message).toEqual('Action client have not been found');
  });
});
