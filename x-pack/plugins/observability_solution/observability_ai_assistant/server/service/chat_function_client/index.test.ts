/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { ChatFunctionClient } from '.';
import { FunctionVisibility } from '../../../common/functions/types';

describe('chatFunctionClient', () => {
  describe('when executing a function with invalid arguments', () => {
    let client: ChatFunctionClient;

    let respondFn: jest.Mock;

    beforeEach(() => {
      respondFn = jest.fn().mockImplementationOnce(async () => {
        return {};
      });

      client = new ChatFunctionClient([]);
      client.registerContext({
        description: '',
        name: 'core',
      });

      client.registerFunction(
        {
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
        respondFn
      );
    });

    it('throws an error', async () => {
      await expect(async () => {
        await client.executeFunction({
          chat: jest.fn(),
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

  describe('when providing application context', () => {
    it('exposes a function that returns the requested data', async () => {
      const client = new ChatFunctionClient([
        {
          screenDescription: 'My description',
          data: [
            {
              name: 'my_dummy_data',
              description: 'My dummy data',
              value: [
                {
                  foo: 'bar',
                },
              ],
            },
            {
              name: 'my_other_dummy_data',
              description: 'My other dummy data',
              value: [
                {
                  foo: 'bar',
                },
              ],
            },
          ],
        },
      ]);

      const functions = client.getFunctions();

      expect(functions[0]).toEqual({
        definition: {
          contexts: ['core'],
          description: expect.any(String),
          name: 'get_data_on_screen',
          parameters: expect.any(Object),
          visibility: FunctionVisibility.AssistantOnly,
        },
        respond: expect.any(Function),
      });

      expect(functions[0].definition.description).toContain(
        dedent(`my_dummy_data: My dummy data
        my_other_dummy_data: My other dummy data
        `)
      );

      const result = await client.executeFunction({
        chat: jest.fn(),
        name: 'get_data_on_screen',
        args: JSON.stringify({ data: ['my_dummy_data'] }),
        messages: [],
        connectorId: '',
        signal: new AbortController().signal,
      });

      expect(result).toEqual({
        content: [
          {
            name: 'my_dummy_data',
            description: 'My dummy data',
            value: [
              {
                foo: 'bar',
              },
            ],
          },
        ],
      });
    });
  });
});
