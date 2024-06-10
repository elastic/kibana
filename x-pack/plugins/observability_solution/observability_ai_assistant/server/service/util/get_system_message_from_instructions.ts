/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { v4 } from 'uuid';
import { UserInstruction } from '../../../common/types';
import { withTokenBudget } from '../../../common/utils/with_token_budget';
import { RegisteredInstruction } from '../types';

export function getSystemMessageFromInstructions({
  registeredInstructions,
  userInstructions,
  requestInstructions,
  availableFunctionNames,
}: {
  registeredInstructions: RegisteredInstruction[];
  userInstructions: UserInstruction[];
  requestInstructions: Array<UserInstruction | string>;
  availableFunctionNames: string[];
}): string {
  const allRegisteredInstructions = compact(
    registeredInstructions.flatMap((instruction) => {
      if (typeof instruction === 'function') {
        return instruction({ availableFunctionNames });
      }
      return instruction;
    })
  );

  const requestInstructionsWithId = requestInstructions.map((instruction) =>
    typeof instruction === 'string' ? { doc_id: v4(), text: instruction } : instruction
  );

  const requestOverrideIds = requestInstructionsWithId.map((instruction) => instruction.doc_id);

  // all request instructions, and those from the KB that are not defined as a request instruction
  const allUserInstructions = requestInstructionsWithId.concat(
    userInstructions.filter((instruction) => !requestOverrideIds.includes(instruction.doc_id))
  );

  const instructionsWithinBudget = withTokenBudget(allUserInstructions, 1000);

  return [
    ...allRegisteredInstructions,
    ...(instructionsWithinBudget.length
      ? [
          `What follows is a set of instructions provided by the user, please abide by them as long as they don't conflict with anything you've been told so far:`,
          ...instructionsWithinBudget,
        ]
      : []),
  ]
    .map((instruction) => {
      return typeof instruction === 'string' ? instruction : instruction.text;
    })
    .join('\n\n');
}
