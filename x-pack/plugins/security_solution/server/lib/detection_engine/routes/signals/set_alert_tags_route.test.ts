/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSetAlertTagsRequestMock } from '../../../../../common/api/detection_engine/alert_tags/mocks';
import { DETECTION_ENGINE_ALERT_TAGS_URL } from '../../../../../common/constants';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import { setAlertTagsRoute } from './set_alert_tags_route';

describe('setAlertTagsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    setAlertTagsRoute(server.router);
  });

  describe('happy path', () => {
    test('returns 200 when adding/removing empty arrays of tags', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-2'], ['test-id']),
      });

      context.core.elasticsearch.client.asCurrentUser.bulk.mockResponse({
        errors: false,
        took: 0,
        items: [{ update: { result: 'updated', status: 200, _index: 'test-index' } }],
      });

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.status).toEqual(200);
    });
  });

  describe('validation', () => {
    test('returns 400 if duplicate tags are in both the add and remove arrays', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-1'], ['test-id']),
      });

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
        getSuccessfulSignalUpdateResponse()
      );

      const response = await server.inject(request, requestContextMock.convertContext(context));

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      expect(response.body).toEqual({
        message: [
          `Duplicate tags [\"tag-1\"] were found in the tags_to_add and tags_to_remove parameters.`,
        ],
        status_code: 400,
      });
    });

    test('returns 400 if no alert ids are provided', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-2']),
      });

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockResponse(
        getSuccessfulSignalUpdateResponse()
      );

      const response = await server.inject(request, requestContextMock.convertContext(context));

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      expect(response.body).toEqual({
        message: [`No alert ids were provided`],
        status_code: 400,
      });
    });
  });

  describe('500s', () => {
    test('returns 500 if asCurrentUser throws error', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_TAGS_URL,
        body: getSetAlertTagsRequestMock(['tag-1'], ['tag-2'], ['test-id']),
      });

      context.core.elasticsearch.client.asCurrentUser.updateByQuery.mockRejectedValue(
        new Error('Test error')
      );

      const response = await server.inject(request, requestContextMock.convertContext(context));

      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });
});
