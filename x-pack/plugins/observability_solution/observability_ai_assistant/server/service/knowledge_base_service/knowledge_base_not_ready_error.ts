/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class KnowledgeBaseNotReadyError extends Error {
  constructor(message: string, body: any) {
    super(message, { cause: body });
    Object.setPrototypeOf(this, KnowledgeBaseNotReadyError.prototype);
  }
}
