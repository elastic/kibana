/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { correctQueryWithAst } from './ast';
import { correctCommonEsqlMistakes as correctQueryWithoutAst } from './non_ast';

export const correctCommonEsqlMistakes = (query: string) => {
  const { output: outputWithoutAst, isCorrection: correctionWithoutAst } =
    correctQueryWithoutAst(query);
  const { output: corrected, corrections } = correctQueryWithAst(outputWithoutAst);
  return {
    input: query,
    output: corrected,
    isCorrection: correctionWithoutAst || corrections.length > 0,
  };
};
