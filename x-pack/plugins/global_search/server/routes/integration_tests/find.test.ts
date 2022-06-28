/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import supertest from 'supertest';
import { setupServer } from '@kbn/core/server/test_utils';
import { GlobalSearchResult, GlobalSearchBatchedResults } from '../../../common/types';
import { GlobalSearchFindError } from '../../../common/errors';
import { globalSearchPluginMock } from '../../mocks';
import { registerInternalFindRoute } from '../find';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;
const pluginId = Symbol('globalSearch');

const createResult = (id: string): GlobalSearchResult => ({
  id,
  title: id,
  type: 'test',
  url: `/app/test/${id}`,
  score: 42,
});

const createBatch = (...ids: string[]): GlobalSearchBatchedResults => ({
  results: ids.map(createResult),
});

const expectedResults = (...ids: string[]) => ids.map((id) => expect.objectContaining({ id }));

describe('POST /internal/global_search/find', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let globalSearchHandlerContext: ReturnType<
    typeof globalSearchPluginMock.createRouteHandlerContext
  >;

  beforeEach(async () => {
    ({ server, httpSetup } = await setupServer(pluginId));

    globalSearchHandlerContext = globalSearchPluginMock.createRouteHandlerContext();
    httpSetup.registerRouteHandlerContext<
      ReturnType<typeof globalSearchPluginMock.createRequestHandlerContext>,
      'globalSearch'
    >(pluginId, 'globalSearch', () => globalSearchHandlerContext);

    const router = httpSetup.createRouter<any>('/');

    registerInternalFindRoute(router);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('calls the handler context with correct parameters', async () => {
    await supertest(httpSetup.server.listener)
      .post('/internal/global_search/find')
      .send({
        params: {
          term: 'search',
        },
        options: {
          preference: 'custom-pref',
        },
      })
      .expect(200);

    expect(globalSearchHandlerContext.find).toHaveBeenCalledTimes(1);
    expect(globalSearchHandlerContext.find).toHaveBeenCalledWith(
      { term: 'search' },
      {
        preference: 'custom-pref',
        aborted$: expect.any(Object),
      }
    );
  });

  it('returns all the results returned from the service', async () => {
    globalSearchHandlerContext.find.mockReturnValue(
      of(createBatch('1', '2'), createBatch('3', '4'))
    );

    const response = await supertest(httpSetup.server.listener)
      .post('/internal/global_search/find')
      .send({
        params: {
          term: 'search',
        },
      })
      .expect(200);

    expect(response.body).toEqual({
      results: expectedResults('1', '2', '3', '4'),
    });
  });

  it('returns a 403 when the observable throws an invalid-license error', async () => {
    globalSearchHandlerContext.find.mockReturnValue(
      throwError(GlobalSearchFindError.invalidLicense('invalid-license-message'))
    );

    const response = await supertest(httpSetup.server.listener)
      .post('/internal/global_search/find')
      .send({
        params: {
          term: 'search',
        },
      })
      .expect(403);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'invalid-license-message',
        statusCode: 403,
      })
    );
  });

  it('returns the default error when the observable throws any other error', async () => {
    globalSearchHandlerContext.find.mockReturnValue(throwError('any-error'));

    const response = await supertest(httpSetup.server.listener)
      .post('/internal/global_search/find')
      .send({
        params: {
          term: 'search',
        },
      })
      .expect(500);

    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'An internal server error occurred. Check Kibana server logs for details.',
        statusCode: 500,
      })
    );
  });
});
