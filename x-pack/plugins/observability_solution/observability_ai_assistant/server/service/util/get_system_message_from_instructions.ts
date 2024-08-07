/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, partition, uniqBy } from 'lodash';
import { v4 } from 'uuid';
import { AdHocInstruction, Instruction } from '../../../common/types';
import { withTokenBudget } from '../../../common/utils/with_token_budget';
import { InstructionOrCallback } from '../types';

export const USER_INSTRUCTIONS_HEADER = `## User instructions
          
What follows is a set of instructions provided by the user, please abide by them
as long as they don't conflict with anything you've been told so far:

`;

export function getSystemMessageFromInstructions({
  // application instructions registered by the functions. These will be displayed first
  applicationInstructions,

  // instructions provided by the user. These will be displayed after the application instructions and only if they fit within the token budget
  userInstructions: kbUserInstructions,

  // ad-hoc instruction. Can be either user or application instruction
  adHocInstructions,
  availableFunctionNames,
}: {
  applicationInstructions: InstructionOrCallback[];
  userInstructions: Instruction[];
  adHocInstructions: AdHocInstruction[];
  availableFunctionNames: string[];
}): string {
  const allApplicationInstructions = compact(
    applicationInstructions.flatMap((instruction) => {
      if (typeof instruction === 'function') {
        return instruction({ availableFunctionNames });
      }
      return instruction;
    })
  );

  // split ad hoc instructions into user instructions and application instructions
  const [adHocUserInstructions, adHocApplicationInstructions] = partition(
    adHocInstructions,
    (instruction) => instruction.instruction_type === 'user_instruction'
  );

  // all request instructions and KB instructions.
  // request instructions will be prioritized over Knowledge Base instructions if the doc_id is the same
  const allUserInstructions = withTokenBudget(
    uniqBy([...adHocUserInstructions, ...kbUserInstructions], (i) => i.doc_id),
    1000
  );

  return [
    // application instructions
    ...allApplicationInstructions.concat(adHocApplicationInstructions),

    // user instructions
    ...(allUserInstructions.length ? [USER_INSTRUCTIONS_HEADER, ...allUserInstructions] : []),
  ]
    .map((instruction) => {
      return typeof instruction === 'string' ? instruction : instruction.text;
    })
    .join('\n\n');
}

export function buildUserInstruction(text: string): AdHocInstruction {
  return { doc_id: v4(), text, instruction_type: 'user_instruction' };
}

export function buildApplicationInstruction(text: string): AdHocInstruction {
  return { doc_id: v4(), text, instruction_type: 'application_instruction' };
}
