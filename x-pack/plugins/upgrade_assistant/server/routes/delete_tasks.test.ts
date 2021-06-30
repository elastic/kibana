/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from '@commercial/hapi';
import { registerDeleteTasksRoutes } from './delete_tasks';

describe('delete tasks API', () => {
  const callWithRequest = jest.fn();
  const server = new Server();
  server.plugins = {
    elasticsearch: {
      getCluster: () => ({ callWithRequest } as any),
    } as any,
  } as any;

  registerDeleteTasksRoutes(server);

  beforeEach(callWithRequest.mockReset);

  describe('POST /api/upgrade_assistant/delete_tasks_index', () => {
    it('calls delete endpoint and returns success', async () => {
      callWithRequest.mockResolvedValueOnce({ acknowledged: true });

      const resp = await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/delete_tasks_index',
      });

      expect(resp.statusCode).toEqual(200);
      expect(JSON.parse(resp.payload)).toEqual({ success: true });
      expect(callWithRequest).toHaveBeenCalled();
      const [, endpoint, body] = callWithRequest.mock.calls[0];
      expect(endpoint).toEqual('indices.delete');
      expect(body).toEqual({ index: '.tasks' });
    });

    it('returns an error if callWithRequest fails', async () => {
      callWithRequest.mockRejectedValueOnce(new Error('Timeout!'));

      const resp = await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/delete_tasks_index',
      });

      expect(resp.statusCode).toEqual(500);
      expect(JSON.parse(resp.payload)).toMatchInlineSnapshot(`
Object {
  "error": "Internal Server Error",
  "message": "An internal server error occurred",
  "statusCode": 500,
}
`);
    });
  });
});
