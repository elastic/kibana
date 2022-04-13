/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../index';
import { registerNodesRoute } from './register_nodes_route';
import { RouterMock, routeDependencies, RequestMock } from '../../../test/helpers';

describe('[Index management API Routes] Nodes info', () => {
  const router = new RouterMock();

  const getNodesInfo = router.getMockESApiFn('nodes.info');

  beforeAll(() => {
    registerNodesRoute({
      ...routeDependencies,
      router,
    });
  });

  test('getNodesPlugins()', async () => {
    const mockRequest: RequestMock = {
      method: 'get',
      path: addBasePath('/nodes/plugins'),
    };

    // Mock the response from the ES client ('nodes.info()')
    getNodesInfo.mockResolvedValue({
      nodes: {
        node1: {
          plugins: [{ name: 'plugin-1' }, { name: 'plugin-2' }],
        },
        node2: {
          plugins: [{ name: 'plugin-1' }, { name: 'plugin-3' }],
        },
      },
    });

    await expect(router.runRequest(mockRequest)).resolves.toEqual({
      body: ['plugin-1', 'plugin-2', 'plugin-3'],
    });
  });
});
