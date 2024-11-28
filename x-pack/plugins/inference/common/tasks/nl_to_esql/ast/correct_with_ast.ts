/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, parse } from '@kbn/esql-ast';
import { getCorrections, type QueryCorrection } from './corrections';

interface CorrectWithAstResult {
  output: string;
  corrections: QueryCorrection[];
}

export const correctQueryWithAst = (query: string): CorrectWithAstResult => {
  const { root, errors } = parse(query);
  // don't try modifying anything if the query is not syntactically correct
  if (errors) {
    return {
      output: query,
      corrections: [],
    };
  }

  const corrections = getCorrections(root);

  const multiline = /\r?\n/.test(query);
  const formattedQuery = BasicPrettyPrinter.print(root, { multiline, pipeTab: '' });

  return {
    output: formattedQuery,
    corrections,
  };
};
