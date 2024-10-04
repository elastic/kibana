/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenerationErrorCode } from '../constants';

// Errors raised by the generation process should provide information through this interface.
export interface GenerationErrorBody {
  message: string;
  attributes: GenerationErrorAttributes;
}

export interface GenerationErrorAttributes {
  errorCode: GenerationErrorCode;
  underlyingMessages: string[] | undefined;
}
