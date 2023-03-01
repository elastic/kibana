/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createResolvedLogViewMock } from '../../../common/log_views/resolved_log_view.mock';
import { ILogViewsClient } from './types';

export const createLogViewsClientMock = (): jest.Mocked<ILogViewsClient> => ({
  getLogView: jest.fn(),
  getResolvedLogView: jest.fn((logViewId: string) => Promise.resolve(createResolvedLogViewMock())),
  putLogView: jest.fn(),
  resolveLogView: jest.fn(),
});
