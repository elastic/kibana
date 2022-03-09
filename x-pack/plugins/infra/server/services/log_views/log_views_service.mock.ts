/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogViewsClientMock } from './log_views_client.mock';
import { LogViewsServiceStart } from './types';

export const createLogViewsServiceStartMock = (): jest.Mocked<LogViewsServiceStart> => ({
  getClient: jest.fn((_savedObjectsClient: any, _elasticsearchClient: any) =>
    createLogViewsClientMock()
  ),
  getScopedClient: jest.fn((_request: any) => createLogViewsClientMock()),
});
