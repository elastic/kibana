/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleCustomErrors } from './routes_util';
import { GraphRecursionError } from '@langchain/langgraph';
import { RecursionLimitError } from '../lib/errors';

describe('handleError', () => {
  it('should throw a RecursionLimitError when given a GraphRecursionError', () => {
    const errorMessage = 'Recursion limit exceeded';
    const errorCode = 'RECURSION_LIMIT_EXCEEDED';
    const recursionError = new GraphRecursionError(errorMessage);

    expect(() => {
      handleCustomErrors(recursionError, errorCode);
    }).toThrow(RecursionLimitError);
    expect(() => {
      handleCustomErrors(recursionError, errorCode);
    }).toThrowError(errorMessage);
  });

  it('should rethrow the error when given an error that is not a GraphRecursionError', () => {
    const errorMessage = 'Some other error';
    const errorCode = 'SOME_OTHER_ERROR';
    const otherError = new Error(errorMessage);

    expect(() => {
      handleCustomErrors(otherError, errorCode);
    }).toThrow(otherError);
    expect(() => {
      handleCustomErrors(otherError, errorCode);
    }).toThrowError(errorMessage);
  });
});
