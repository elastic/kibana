/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ExtensionPointError extends Error {
  public readonly meta?: unknown;

  constructor(message: string, meta?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.meta = meta;
  }
}
