/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Ajv, { type ValidateFunction } from 'ajv';
import { ChatFunctionClient } from '.';
import type { ContextRegistry } from '../../../common/types';
import type { FunctionHandlerRegistry } from '../types';

describe('chatFunctionClient', () => {
  describe('when executing a function with invalid arguments', () => {
    let client: ChatFunctionClient;

    let respondFn: jest.Mock;

    beforeEach(() => {
      const contextRegistry: ContextRegistry = new Map();
      contextRegistry.set('core', {
        description: '',
        name: 'core',
      });

      respondFn = jest.fn().mockImplementationOnce(async () => {
        return {};
      });

      const functionRegistry: FunctionHandlerRegistry = new Map();
      functionRegistry.set('myFunction', {
        respond: respondFn,
        definition: {
          contexts: ['core'],
          description: '',
          name: 'myFunction',
          parameters: {
            properties: {
              foo: {
                type: 'string',
              },
            },
            required: ['foo'],
          },
        },
      });

      const validators = new Map<string, ValidateFunction>();

      validators.set(
        'myFunction',
        new Ajv({ strict: false }).compile(
          functionRegistry.get('myFunction')!.definition.parameters
        )
      );

      client = new ChatFunctionClient(contextRegistry, functionRegistry, validators);
    });

    it('throws an error', async () => {
      await expect(async () => {
        await client.executeFunction({
          name: 'myFunction',
          args: JSON.stringify({
            foo: 0,
          }),
          messages: [],
          signal: new AbortController().signal,
          connectorId: '',
        });
      }).rejects.toThrowError(`Function arguments are invalid`);

      expect(respondFn).not.toHaveBeenCalled();
    });
  });
});
