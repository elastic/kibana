/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe as lodashPipe } from 'lodash/fp';
import {
  ImportExceptionListItemSchema,
  ImportExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionsImport, PromiseFromStreams } from '../../import_exception_list_and_items';

import { validateExceptions } from './validate_incoming_exceptions';
import { sortExceptions } from './sort_incoming_exceptions';

export const checkLimits = (limit: number): ((arg: ExceptionsImport) => ExceptionsImport) => {
  return (exceptions: ExceptionsImport): ExceptionsImport => {
    if (exceptions.length >= limit) {
      throw new Error(`Can't import more than ${limit} exceptions`);
    }

    return exceptions;
  };
};

export const exceptionsChecksFromArray = (
  exceptionsToImport: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>,
  exceptionsLimit: number
): PromiseFromStreams => {
  const checks = [checkLimits(exceptionsLimit), sortExceptions, validateExceptions];
  return lodashPipe(checks)(exceptionsToImport);
};
