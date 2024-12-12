/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ContextLimitError extends Error {
  public modelLimit: number;
  public currentTokens: number;

  constructor(message: string, modelLimit: number, currentTokens: number) {
    super(message);
    this.name = 'ContextLimitError';
    this.modelLimit = modelLimit;
    this.currentTokens = currentTokens;
  }
}
