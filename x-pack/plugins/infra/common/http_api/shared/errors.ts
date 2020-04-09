/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

const createErrorRuntimeType = <Attributes extends rt.Mixed = rt.UndefinedType>(
  statusCode: number,
  errorCode: string,
  attributes?: Attributes
) =>
  rt.type({
    statusCode: rt.literal(statusCode),
    error: rt.literal(errorCode),
    message: rt.string,
    ...(!!attributes ? { attributes } : {}),
  });

export const badRequestErrorRT = createErrorRuntimeType(400, 'Bad Request');
export const forbiddenErrorRT = createErrorRuntimeType(403, 'Forbidden');
export const conflictErrorRT = createErrorRuntimeType(409, 'Conflict');
