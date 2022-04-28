/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ILogViewsClient } from './types';

export const createLogViewsClientMock = (): jest.Mocked<ILogViewsClient> => ({
  getLogView: jest.fn(),
  getResolvedLogView: jest.fn(),
  putLogView: jest.fn(),
  resolveLogView: jest.fn(),
});
