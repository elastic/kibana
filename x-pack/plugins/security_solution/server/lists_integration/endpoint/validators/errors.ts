/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListsErrorWithStatusCode } from '@kbn/lists-plugin/server';

export class EndpointArtifactExceptionValidationError extends ListsErrorWithStatusCode {
  constructor(message: string, statusCode: number = 400) {
    super(`EndpointArtifactError: ${message}`, statusCode);
  }
}
