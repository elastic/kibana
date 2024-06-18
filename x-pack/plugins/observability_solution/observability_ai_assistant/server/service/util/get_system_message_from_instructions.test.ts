/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getSystemMessageFromInstructions,
  USER_INSTRUCTIONS_HEADER,
} from './get_system_message_from_instructions';

describe('getSystemMessageFromInstructions', () => {
  it('handles plain instructions', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: ['first', 'second'],
        userInstructions: [],
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
        userInstructions: [],
        requestInstructions: [],
        availableFunctionNames: ['myFunction'],
      })
    ).toEqual(`first\n\nmyFunction`);
  });

  it('overrides kb instructions with request instructions', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: ['first'],
        userInstructions: [{ doc_id: 'second', text: 'second_kb' }],
        requestInstructions: [{ doc_id: 'second', text: 'second_request' }],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\n${USER_INSTRUCTIONS_HEADER}\n\nsecond_request`);
  });

  it('includes kb instructions if there is no request instruction', () => {
    expect(
      getSystemMessageFromInstructions({
        registeredInstructions: ['first'],
        userInstructions: [{ doc_id: 'second', text: 'second_kb' }],
        requestInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\n${USER_INSTRUCTIONS_HEADER}\n\nsecond_kb`);
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
        userInstructions: [],
        requestInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first`);
  });
});
