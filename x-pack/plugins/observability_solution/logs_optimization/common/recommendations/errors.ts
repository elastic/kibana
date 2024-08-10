/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class FetchRecommendationsError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'FetchRecommendationsError';
  }
}

export class DecodeRecommendationsError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'DecodeRecommendationsError';
  }
}
