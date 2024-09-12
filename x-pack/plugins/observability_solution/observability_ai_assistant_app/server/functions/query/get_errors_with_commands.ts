/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditorError, ESQLMessage } from '@kbn/esql-ast';
import { splitIntoCommands } from '@kbn/inference-plugin/common';

export function getErrorsWithCommands(query: string, errors: Array<ESQLMessage | EditorError>) {
  const asCommands = splitIntoCommands(query);

  const errorMessages = errors.map((error) => {
    if ('location' in error) {
      const commandsUntilEndOfError = splitIntoCommands(query.substring(0, error.location.max));
      const lastCompleteCommand = asCommands[commandsUntilEndOfError.length - 1];
      if (lastCompleteCommand) {
        return `Error in \`| ${lastCompleteCommand.command}\`:\n ${error.text}`;
      }
    }
    return 'text' in error ? error.text : error.message;
  });

  return errorMessages;
}
