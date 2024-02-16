/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { promptSuggestionsFunctionDefinition } from '../../common/functions/prompt_suggestions';
import type { FunctionRegistrationParameters } from '.';

export function registerPromptSuggestionsFunction({
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    promptSuggestionsFunctionDefinition,
    async ({ arguments: { suggestions } }, signal) => {
      return {
        content: dedent(`Displaying ${suggestions.length} prompt suggestions to the user:
        ${suggestions.join('\n')}`),
      };
    }
  );
}
