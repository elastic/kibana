/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError } from '@elastic/elasticsearch/lib/errors';
import get from 'lodash/get';

const PARSING_ERROR_TYPE = 'parsing_exception';
const VERIFICATION_ERROR_TYPE = 'verification_exception';

interface ErrorCause {
  type: string;
  reason: string;
}

export type ParsingError = ResponseError<{
  error: ErrorCause & { root_cause: ErrorCause[] };
}>;

export const isParsingErrorType = (type: unknown): boolean =>
  type === PARSING_ERROR_TYPE || type === VERIFICATION_ERROR_TYPE;

export const isParsingError = (error: unknown): error is ParsingError =>
  error instanceof ResponseError && isParsingErrorType(get(error, 'meta.body.error.type'));

export const getParsingErrors = (error: ParsingError): string[] =>
  error.body.error.root_cause
    .filter((cause) => isParsingErrorType(cause.type))
    .map((cause) => cause.reason);
