/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { splitIntoCommands } from '../../../../common/tasks/nl_to_esql/correct_common_esql_mistakes';

interface QuerySyntaxError {
  message: string;
  startPos: number;
  endPos: number;
  code?: string;
}

/**
 * Run the query through the kibana
 * @param query
 */
export const validateQueryAst = async (query: string): Promise<QuerySyntaxError[]> => {
  const { errors: astErrors } = await validateQuery(query, getAstAndSyntaxErrors, {
    // setting this to true, we don't want to validate the index / fields existence
    ignoreOnMissingCallbacks: true,
  });

  const asCommands = splitIntoCommands(query);

  const errors = (astErrors ?? []).map<QuerySyntaxError>((error) => {
    if ('location' in error) {
      return {
        message: error.text,
        code: error.code,
        startPos: error.location.min,
        endPos: error.location.max,
      };
    } else {
      return {
        message: error.message,
        code: error.code,
        startPos: getPosition(asCommands, error.startLineNumber, error.startColumn),
        endPos: getPosition(asCommands, error.endLineNumber, error.endColumn),
      };
    }
  });

  return errors;
};

const getPosition = (
  commands: ReturnType<typeof splitIntoCommands>,
  line: number,
  column: number
): number => {
  const previousCommands = commands.slice(0, line - 1);
  return (
    previousCommands.reduce((count, command) => {
      return count + command.command.length;
    }, 0) + column
  );
};
