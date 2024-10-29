/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateQuery, getActions } from '@kbn/esql-validation-autocomplete';
import { getAstAndSyntaxErrors } from '@kbn/esql-ast';

const fixedQueryByOneAction = async (queryString: string) => {
  const { errors } = await validateQuery(queryString, getAstAndSyntaxErrors, {
    ignoreOnMissingCallbacks: true,
  });

  const actions = await getActions(queryString, errors, getAstAndSyntaxErrors, {
    relaxOnMissingCallbacks: true,
  });

  if (actions.length) {
    const [firstAction] = actions;
    const range = firstAction.edits[0].range;
    const correctText = firstAction.edits[0].text;
    const problematicString = queryString.substring(range.startColumn - 1, range.endColumn - 1);
    const fixedQuery = queryString.replace(problematicString, correctText);

    return {
      query: fixedQuery,
      shouldRunAgain: Boolean(actions.length),
    };
  }
  return {
    query: queryString,
    shouldRunAgain: false,
  };
};

/**
 * @param queryString
 * @returns corrected queryString
 * The cases that are handled are:
 * - Query stats / eval functions have typos e.g. aveg instead of avg
 * - Unquoted fields e.g. keep field-1 instead of keep `field-1`
 * - Unquoted fields in stats or eval e.g. stats avg(field-1) instead of stats avg(`field-1`)
 * - Combination of the above
 */

export const correctQueryWithActions = async (queryString: string) => {
  let shouldCorrectQuery = true;
  let fixedQuery = queryString;
  // this is an escape hatch, the loop will end automatically if the ast doesnt return more actions
  // in case it goes wrong, we allow it to loop 10 times
  let limit = 10;

  while (shouldCorrectQuery && limit >= 0) {
    const { query, shouldRunAgain } = await fixedQueryByOneAction(fixedQuery);
    shouldCorrectQuery = shouldRunAgain;
    fixedQuery = query;
    limit--;
  }

  return fixedQuery;
};
