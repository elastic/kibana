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
        applicationInstructions: ['first', 'second'],
        userInstructions: [],
        adHocInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\nsecond`);
  });

  it('handles callbacks', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: [
          'first',
          ({ availableFunctionNames }) => {
            return availableFunctionNames[0];
          },
        ],
        userInstructions: [],
        adHocInstructions: [],
        availableFunctionNames: ['myFunction'],
      })
    ).toEqual(`first\n\nmyFunction`);
  });

  it('overrides kb instructions with request instructions', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: ['first'],
        userInstructions: [{ doc_id: 'second', text: 'second_kb' }],
        adHocInstructions: [
          { doc_id: 'second', text: 'second_request', instruction_type: 'application_instruction' },
        ],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\n${USER_INSTRUCTIONS_HEADER}\n\nsecond_request`);
  });

  it('includes kb instructions if there is no request instruction', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: ['first'],
        userInstructions: [{ doc_id: 'second', text: 'second_kb' }],
        adHocInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first\n\n${USER_INSTRUCTIONS_HEADER}\n\nsecond_kb`);
  });

  it('handles undefined values', () => {
    expect(
      getSystemMessageFromInstructions({
        applicationInstructions: [
          'first',
          ({ availableFunctionNames }) => {
            return undefined;
          },
        ],
        userInstructions: [],
        adHocInstructions: [],
        availableFunctionNames: [],
      })
    ).toEqual(`first`);
  });
});
