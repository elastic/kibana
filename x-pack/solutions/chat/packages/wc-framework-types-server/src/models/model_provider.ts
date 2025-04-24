/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';

/**
 * Provider, allowing to select various models depending on the needs.
 *
 * For now, only exposes a single default model type.
 */
export interface ModelProvider {
  /**
   * Returns the default model to be used for LLM tasks.
   */
  getDefaultModel: () => InferenceChatModel;
}
