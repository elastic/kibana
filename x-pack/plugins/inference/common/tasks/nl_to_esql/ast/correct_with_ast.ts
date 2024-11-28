/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, parse } from '@kbn/esql-ast';
import { getCorrections } from './corrections';

export const correctQueryWithAst = (query: string): string => {
  const { root, errors } = parse(query);
  // don't try modifying anything if the query is not syntactically correct
  if (errors) {
    return query;
  }

  const corrections = getCorrections(root);

  corrections.forEach((correction) => correction.apply());

  const multiline = /\r?\n/.test(query);
  return BasicPrettyPrinter.print(root, { multiline, pipeTab: '' });
};
