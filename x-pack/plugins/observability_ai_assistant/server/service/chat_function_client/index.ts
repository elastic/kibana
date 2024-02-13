/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/

import type { ErrorObject, ValidateFunction } from 'ajv';
import { keyBy } from 'lodash';
import type {
  ContextDefinition,
  ContextRegistry,
  FunctionResponse,
  Message,
} from '../../../common/types';
import { filterFunctionDefinitions } from '../../../common/utils/filter_function_definitions';
import type { FunctionHandler, FunctionHandlerRegistry } from '../types';

export class FunctionArgsValidationError extends Error {
  constructor(public readonly errors: ErrorObject[]) {
    super('Function arguments are invalid');
  }
}

export class ChatFunctionClient {
  constructor(
    private readonly contextRegistry: ContextRegistry,
    private readonly functionRegistry: FunctionHandlerRegistry,
    private readonly validators: Map<string, ValidateFunction>
  ) {}

  private validate(name: string, parameters: unknown) {
    const validator = this.validators.get(name)!;
    const result = validator(parameters);
    if (!result) {
      throw new FunctionArgsValidationError(validator.errors!);
    }
  }

  getContexts(): ContextDefinition[] {
    return Array.from(this.contextRegistry.values());
  }

  getFunctions({
    contexts,
    filter,
  }: {
    contexts?: string[];
    filter?: string;
  } = {}): FunctionHandler[] {
    const allFunctions = Array.from(this.functionRegistry.values());

    const functionsByName = keyBy(allFunctions, (definition) => definition.definition.name);

    const matchingDefinitions = filterFunctionDefinitions({
      contexts,
      filter,
      definitions: allFunctions.map((fn) => fn.definition),
    });

    return matchingDefinitions.map((definition) => functionsByName[definition.name]);
  }

  hasFunction(name: string): boolean {
    return this.functionRegistry.has(name);
  }

  async executeFunction({
    name,
    args,
    messages,
    signal,
    connectorId,
  }: {
    name: string;
    args: string | undefined;
    messages: Message[];
    signal: AbortSignal;
    connectorId: string;
  }): Promise<FunctionResponse> {
    const fn = this.functionRegistry.get(name);

    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }

    const parsedArguments = args ? JSON.parse(args) : {};

    this.validate(name, parsedArguments);

    return await fn.respond({ arguments: parsedArguments, messages, connectorId }, signal);
  }
}
