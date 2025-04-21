/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';

export type MockedModel = jest.Mocked<InferenceChatModel>;

export const createMockedModel = (): MockedModel => {
  return {
    invoke: jest.fn(),
    withStructuredOutput: jest.fn(),
  } as unknown as MockedModel;
};
