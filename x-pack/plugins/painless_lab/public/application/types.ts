/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PainlessContext } from '@kbn/monaco';

export interface Store {
  payload: Payload;
  validation: Validation;
}

export type ExecutionContext = Exclude<PainlessContext, 'processor_conditional'>;

export interface Payload {
  context: ExecutionContext;
  code: string;
  parameters: string;
  index: string;
  document: string;
  query: string;
}

export interface Validation {
  isValid: boolean;
  fields: {
    index: boolean;
  };
}

export enum PayloadFormat {
  UGLY = 'ugly',
  PRETTY = 'pretty',
}

export interface Response {
  error?: ExecutionError | Error;
  result?: string;
}

export type ExecutionErrorScriptStack = string[];

export interface ExecutionErrorPosition {
  start: number;
  end: number;
  offset: number;
}

export interface ExecutionError {
  script_stack?: ExecutionErrorScriptStack;
  caused_by?: {
    type: string;
    reason: string;
  };
  message?: string;
  position: ExecutionErrorPosition;
  script: string;
}
