/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import dedent from 'dedent';
import { compact, keyBy } from 'lodash';
import {
  ContextDefinition,
  ContextRegistry,
  FunctionResponse,
  FunctionVisibility,
  Message,
  ObservabilityAIAssistantScreenContext,
  RegisterContextDefinition,
} from '../../../common/types';
import { filterFunctionDefinitions } from '../../../common/utils/filter_function_definitions';
import type { FunctionHandler, FunctionHandlerRegistry, RegisterFunction } from '../types';

export class FunctionArgsValidationError extends Error {
  constructor(public readonly errors: ErrorObject[]) {
    super('Function arguments are invalid');
  }
}

const ajv = new Ajv({
  strict: false,
});

export class ChatFunctionClient {
  private readonly contextRegistry: ContextRegistry = new Map();
  private readonly functionRegistry: FunctionHandlerRegistry = new Map();
  private readonly validators: Map<string, ValidateFunction> = new Map();

  constructor(private readonly screenContexts: ObservabilityAIAssistantScreenContext[]) {
    const allData = compact(screenContexts.flatMap((context) => context.data));

    if (allData.length) {
      this.registerFunction(
        {
          name: 'get_data_on_screen',
          contexts: ['core'],
          description: dedent(`Get data that is on the screen:
            ${allData.map((data) => `${data.name}: ${data.description}`).join('\n')}
          `),
          visibility: FunctionVisibility.AssistantOnly,
          parameters: {
            type: 'object',
            additionalProperties: false,
            additionalItems: false,
            properties: {
              data: {
                type: 'array',
                description:
                  'The pieces of data you want to look at it. You can request one, or multiple',
                items: {
                  type: 'string',
                  enum: allData.map((data) => data.name),
                },
                additionalItems: false,
                additionalProperties: false,
              },
            },
            required: ['data' as const],
          },
        },
        async ({ arguments: { data: dataNames } }) => {
          return {
            content: allData.filter((data) => dataNames.includes(data.name)),
          };
        }
      );
    }
  }

  registerFunction: RegisterFunction = (definition, respond) => {
    this.validators.set(definition.name, ajv.compile(definition.parameters));
    this.functionRegistry.set(definition.name, { definition, respond });
  };

  registerContext: RegisterContextDefinition = (context) => {
    this.contextRegistry.set(context.name, context);
  };

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

    return await fn.respond(
      { arguments: parsedArguments, messages, connectorId, screenContexts: this.screenContexts },
      signal
    );
  }
}
