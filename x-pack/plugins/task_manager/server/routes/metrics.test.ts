/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { metricsRoute } from './metrics';

describe('metricsRoute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('registers route', async () => {
    const router = httpServiceMock.createRouter();
    metricsRoute({
      router,
      metrics$: of(),
      taskManagerId: uuidv4(),
    });

    const [config] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/task_manager/metrics"`);
  });
});
