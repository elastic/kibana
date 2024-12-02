/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { correctCommonEsqlMistakes } from './correct_esql_query';

jest.mock('./ast');
jest.mock('./non_ast');
import { correctQueryWithAst } from './ast';
import { correctCommonEsqlMistakes as correctQueryWithoutAst } from './non_ast';

const correctQueryWithAstMock = correctQueryWithAst as jest.MockedFn<typeof correctQueryWithAst>;
const correctQueryWithoutAstMock = correctQueryWithoutAst as jest.MockedFn<
  typeof correctQueryWithoutAst
>;

describe('correctCommonEsqlMistakes', () => {
  beforeEach(() => {
    correctQueryWithoutAstMock.mockImplementation((query) => {
      return {
        input: query,
        output: query,
        isCorrection: false,
      };
    });
    correctQueryWithAstMock.mockImplementation((query) => {
      return {
        output: query,
        corrections: [],
      };
    });
  });

  afterEach(() => {
    correctQueryWithoutAstMock.mockReset();
    correctQueryWithAstMock.mockReset();
  });

  it('calls correctQueryWithoutAst with the right parameters', () => {
    const inputQuery = 'FROM logs | WHERE foo > bar';
    correctCommonEsqlMistakes(inputQuery);

    expect(correctQueryWithoutAstMock).toHaveBeenCalledTimes(1);
    expect(correctQueryWithoutAstMock).toHaveBeenCalledWith(inputQuery);
  });

  it('calls correctQueryWithAst with the right parameters', () => {
    const inputQuery = 'FROM logs | WHERE foo > bar';
    const correctQueryWithoutAstResult = 'FROM logs | WHERE foo > dolly';

    correctQueryWithoutAstMock.mockImplementation((query) => {
      return {
        input: inputQuery,
        output: correctQueryWithoutAstResult,
        isCorrection: true,
      };
    });

    correctCommonEsqlMistakes(inputQuery);

    expect(correctQueryWithAstMock).toHaveBeenCalledTimes(1);
    expect(correctQueryWithAstMock).toHaveBeenCalledWith(correctQueryWithoutAstResult);
  });

  it('returns the corrected query', () => {
    const inputQuery = 'FROM logs | WHERE foo > bar';
    const correctQueryWithAstResult = 'FROM logs | WHERE foo > dolly';

    correctQueryWithAstMock.mockImplementation((query) => {
      return {
        output: correctQueryWithAstResult,
        corrections: [],
      };
    });

    const { input, output } = correctCommonEsqlMistakes(inputQuery);

    expect(input).toEqual(inputQuery);
    expect(output).toEqual(correctQueryWithAstResult);
  });
});
