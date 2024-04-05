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

  const actions = await getActions(queryString, errors, getAstAndSyntaxErrors);

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

export const correctQueryWithActions = async (queryString: string) => {
  let shouldCorrectQuery = true;
  let fixedQuery = queryString;

  while (shouldCorrectQuery) {
    const { query, shouldRunAgain } = await fixedQueryByOneAction(fixedQuery);
    shouldCorrectQuery = shouldRunAgain;
    fixedQuery = query;
  }

  return fixedQuery;
};
