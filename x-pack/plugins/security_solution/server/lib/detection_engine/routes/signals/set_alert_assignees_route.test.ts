/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSetAlertAssigneesRequestMock } from '../../../../../common/api/detection_engine/alert_assignees/mocks';
import { DETECTION_ENGINE_ALERT_ASSIGNEES_URL } from '../../../../../common/constants';
import { requestContextMock, serverMock, requestMock } from '../__mocks__';
import { getSuccessfulSignalUpdateResponse } from '../__mocks__/request_responses';
import { setAlertAssigneesRoute } from './set_alert_assignees_route';

describe('setAlertAssigneesRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let request: ReturnType<typeof requestMock.create>;
  let { context } = requestContextMock.createTools();

  beforeEach(() => {
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    setAlertAssigneesRoute(server.router);
  });

  describe('happy path', () => {
    test('returns 200 when adding/removing empty arrays of assignees', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2'], ['alert-id']),
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
    test('returns 400 if duplicate assignees are in both the add and remove arrays', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-1'], ['test-id']),
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
          `Duplicate assignees [\"assignee-id-1\"] were found in the add and remove parameters.`,
        ],
        status_code: 400,
      });
    });

    test('rejects if no alert ids are provided', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2']),
      });

      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'ids: Array must contain at least 1 element(s)'
      );
    });

    test('rejects if empty string provided as an alert id', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2'], ['']),
      });

      const result = server.validate(request);

      expect(result.badRequest).toHaveBeenCalledWith(
        'ids.0: String must contain at least 1 character(s), ids.0: Invalid'
      );
    });
  });

  describe('500s', () => {
    test('returns 500 if asCurrentUser throws error', async () => {
      request = requestMock.create({
        method: 'post',
        path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
        body: getSetAlertAssigneesRequestMock(['assignee-id-1'], ['assignee-id-2'], ['test-id']),
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
