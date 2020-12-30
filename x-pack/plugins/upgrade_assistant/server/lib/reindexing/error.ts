/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AccessForbidden,
  IndexNotFound,
  CannotCreateIndex,
  ReindexTaskCannotBeDeleted,
  ReindexTaskFailed,
  ReindexAlreadyInProgress,
  MultipleReindexJobsFound,
  ReindexCannotBeCancelled,
  ReindexIsNotInQueue,
} from './error_symbols';

export class ReindexError extends Error {
  constructor(message: string, public readonly symbol: symbol) {
    super(message);
  }
}

export const createErrorFactory = (symbol: symbol) => (message: string) => {
  return new ReindexError(message, symbol);
};

export const error = {
  indexNotFound: createErrorFactory(IndexNotFound),
  accessForbidden: createErrorFactory(AccessForbidden),
  cannotCreateIndex: createErrorFactory(CannotCreateIndex),
  reindexTaskFailed: createErrorFactory(ReindexTaskFailed),
  reindexTaskCannotBeDeleted: createErrorFactory(ReindexTaskCannotBeDeleted),
  reindexAlreadyInProgress: createErrorFactory(ReindexAlreadyInProgress),
  reindexIsNotInQueue: createErrorFactory(ReindexIsNotInQueue),
  multipleReindexJobsFound: createErrorFactory(MultipleReindexJobsFound),
  reindexCannotBeCancelled: createErrorFactory(ReindexCannotBeCancelled),
};
