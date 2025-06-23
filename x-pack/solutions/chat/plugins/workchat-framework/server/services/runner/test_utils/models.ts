/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { ModelProvider } from '@kbn/wc-framework-types-server';

export type MockedModel = jest.Mocked<InferenceChatModel>;
export type ModelProviderMock = jest.Mocked<ModelProvider>;

export const createMockedModel = (): MockedModel => {
  return {
    invoke: jest.fn(),
    withStructuredOutput: jest.fn(),
  } as unknown as MockedModel;
};

export const createModelProviderMock = (): ModelProviderMock => {
  return {
    getDefaultModel: jest.fn().mockReturnValue(createMockedModel()),
  };
};
