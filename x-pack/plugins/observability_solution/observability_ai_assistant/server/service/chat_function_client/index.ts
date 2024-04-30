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
import { FunctionVisibility, type FunctionResponse } from '../../../common/functions/types';
import type { Message, ObservabilityAIAssistantScreenContextRequest } from '../../../common/types';
import { filterFunctionDefinitions } from '../../../common/utils/filter_function_definitions';
import type {
  FunctionCallChatFunction,
  FunctionHandler,
  FunctionHandlerRegistry,
  RegisteredInstruction,
  RegisterFunction,
  RegisterInstruction,
} from '../types';

export class FunctionArgsValidationError extends Error {
  constructor(public readonly errors: ErrorObject[]) {
    super('Function arguments are invalid');
  }
}

const ajv = new Ajv({
  strict: false,
});

export class ChatFunctionClient {
  private readonly instructions: RegisteredInstruction[] = [];
  private readonly functionRegistry: FunctionHandlerRegistry = new Map();
  private readonly validators: Map<string, ValidateFunction> = new Map();

  private readonly actions: Required<ObservabilityAIAssistantScreenContextRequest>['actions'];

  constructor(private readonly screenContexts: ObservabilityAIAssistantScreenContextRequest[]) {
    const allData = compact(screenContexts.flatMap((context) => context.data));

    this.actions = compact(screenContexts.flatMap((context) => context.actions));

    if (allData.length) {
      this.registerFunction(
        {
          name: 'get_data_on_screen',
          description: dedent(`Get data that is on the screen:
            ${allData.map((data) => `${data.name}: ${data.description}`).join('\n')}
          `),
          visibility: FunctionVisibility.AssistantOnly,
          parameters: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                description:
                  'The pieces of data you want to look at it. You can request one, or multiple',
                items: {
                  type: 'string',
                  enum: allData.map((data) => data.name),
                },
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

    this.actions.forEach((action) => {
      if (action.parameters) {
        this.validators.set(action.name, ajv.compile(action.parameters));
      }
    });
  }

  registerFunction: RegisterFunction = (definition, respond) => {
    if (definition.parameters) {
      this.validators.set(definition.name, ajv.compile(definition.parameters));
    }
    this.functionRegistry.set(definition.name, { definition, respond });
  };

  registerInstruction: RegisterInstruction = (instruction) => {
    this.instructions.push(instruction);
  };

  validate(name: string, parameters: unknown) {
    const validator = this.validators.get(name)!;
    if (!validator) {
      return;
    }

    const result = validator(parameters);
    if (!result) {
      throw new FunctionArgsValidationError(validator.errors!);
    }
  }

  getInstructions(): RegisteredInstruction[] {
    return this.instructions;
  }

  hasAction(name: string) {
    return !!this.actions.find((action) => action.name === name)!;
  }

  getFunctions({
    filter,
  }: {
    filter?: string;
  } = {}): FunctionHandler[] {
    const allFunctions = Array.from(this.functionRegistry.values());

    const functionsByName = keyBy(allFunctions, (definition) => definition.definition.name);

    const matchingDefinitions = filterFunctionDefinitions({
      filter,
      definitions: allFunctions.map((fn) => fn.definition),
    });

    return matchingDefinitions.map((definition) => functionsByName[definition.name]);
  }

  getActions() {
    return this.actions;
  }

  hasFunction(name: string): boolean {
    return this.functionRegistry.has(name);
  }

  async executeFunction({
    chat,
    name,
    args,
    messages,
    signal,
  }: {
    chat: FunctionCallChatFunction;
    name: string;
    args: string | undefined;
    messages: Message[];
    signal: AbortSignal;
  }): Promise<FunctionResponse> {
    const fn = this.functionRegistry.get(name);

    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }

    const parsedArguments = args ? JSON.parse(args) : {};

    this.validate(name, parsedArguments);

    return await fn.respond(
      {
        arguments: parsedArguments,
        messages,
        screenContexts: this.screenContexts,
        chat,
      },
      signal
    );
  }
}
