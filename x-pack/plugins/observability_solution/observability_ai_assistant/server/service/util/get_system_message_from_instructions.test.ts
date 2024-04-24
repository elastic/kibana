/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSystemMessageFromInstructions } from './get_system_message_from_instructions';

describe('getSystemMessageFromInstructions', () => {
  it('handles plain instructions', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: ['first', 'second'],
        knowledgeBaseInstructions: [],
        requestInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\nsecond`);
  });

  it('handles callbacks', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: [
          'first',
          ({ availableFunctionNames }) => {
            return availableFunctionNames[0];
          },
        ],
        knowledgeBaseInstructions: [],
        requestInstructions: [],
        availableFunctionNames: ['myFunction'],
      })
    ).toEqual(`first\n\nmyFunction`);
  });

  it('overrides kb instructions with request instructions', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: ['first'],
        knowledgeBaseInstructions: [{ doc_id: 'second', text: 'second_kb' }],
        requestInstructions: [{ doc_id: 'second', text: 'second_request' }],
        availableFunctionNames: [],
      })
    ).toEqual(
      `first\n\nWhat follows is a set of instructions provided by the user, please abide by them as long as they don't conflict with anything you've been told so far:\n\nsecond_request`
    );
  });

  it('includes kb instructions if there is no request instruction', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: ['first'],
        knowledgeBaseInstructions: [{ doc_id: 'second', text: 'second_kb' }],
        requestInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(
      `first\n\nWhat follows is a set of instructions provided by the user, please abide by them as long as they don't conflict with anything you've been told so far:\n\nsecond_kb`
    );
  });

  it('handles undefined values', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: [
          'first',
          ({ availableFunctionNames }) => {
            return undefined;
          },
        ],
        knowledgeBaseInstructions: [],
        requestInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first`);
  });
});
