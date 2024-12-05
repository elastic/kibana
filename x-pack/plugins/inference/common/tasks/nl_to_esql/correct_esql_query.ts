/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { correctQueryWithAst } from './ast';
import { correctCommonEsqlMistakes as correctQueryWithoutAst } from './non_ast';

/**
 * Correct some common ES|QL syntax and grammar mistakes that LLM can potentially do.
 *
 * Correcting the query is done in two steps:
 * 1. we try to correct the *syntax*, without AST (given it requires a valid syntax)
 * 2. we try to correct the *grammar*, using AST this time.
 */
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
