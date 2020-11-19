/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ErrorThatHandlesItsOwnResponse } from './types';

export function isErrorThatHandlesItsOwnResponse(
  e: ErrorThatHandlesItsOwnResponse
): e is ErrorThatHandlesItsOwnResponse {
  return typeof (e as ErrorThatHandlesItsOwnResponse).sendResponse === 'function';
}

export { ActionTypeDisabledError, ActionTypeDisabledReason } from './action_type_disabled';
