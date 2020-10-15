/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IToasts, FatalErrorsSetup } from 'src/core/public';

export let toasts: IToasts;
export let fatalErrors: FatalErrorsSetup;

export function init(_toasts: IToasts, _fatalErrors: FatalErrorsSetup): void {
  toasts = _toasts;
  fatalErrors = _fatalErrors;
}
