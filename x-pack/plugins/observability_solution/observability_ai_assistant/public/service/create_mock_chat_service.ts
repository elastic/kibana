/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryCounter } from '@kbn/analytics-client';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { Observable } from 'rxjs';
import type { ObservabilityAIAssistantChatService } from '../types';

type MockedChatService = DeeplyMockedKeys<ObservabilityAIAssistantChatService>;

export const createMockChatService = (): MockedChatService => {
  const mockChatService: MockedChatService = {
    chat: jest.fn(),
    complete: jest.fn(),
    analytics: {
      optIn: jest.fn(),
      reportEvent: jest.fn(),
      telemetryCounter$: new Observable<TelemetryCounter>() as any,
    },
    getContexts: jest.fn().mockReturnValue([{ name: 'core', description: '' }]),
    getFunctions: jest.fn().mockReturnValue([]),
    hasFunction: jest.fn().mockReturnValue(false),
    hasRenderFunction: jest.fn().mockReturnValue(true),
    renderFunction: jest.fn(),
  };
  return mockChatService;
};
