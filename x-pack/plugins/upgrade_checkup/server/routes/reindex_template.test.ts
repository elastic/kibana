/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { registerReindexTemplateRoutes } from './reindex_templates';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the reindex_console_template test.
 */
describe('reindex template API', () => {
  const callWithRequest = jest.fn();
  const server = new Server();
  server.plugins = {
    elasticsearch: {
      getCluster: () => ({ callWithRequest } as any),
    } as any,
  } as any;

  registerReindexTemplateRoutes(server);

  describe('GET /api/upgrade_checkup/reindex/{indexName}.json', () => {
    it('returns a template', async () => {
      callWithRequest.mockResolvedValue({
        myIndex: {
          settings: {
            'index.number_of_replicas': '0',
          },
          mappings: {
            properties: {
              '@message': {
                type: 'text',
              },
            },
          },
        },
      });
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_checkup/reindex/console_template/myIndex.json',
      });

      expect(resp.statusCode).toEqual(200);
      expect(resp.payload).toMatchSnapshot();
    });

    it('returns an error if it throws', async () => {
      callWithRequest.mockRejectedValue(new Error(`scary error!`));
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_checkup/reindex/console_template/myIndex.json',
      });

      expect(resp.statusCode).toEqual(500);
    });
  });
});
