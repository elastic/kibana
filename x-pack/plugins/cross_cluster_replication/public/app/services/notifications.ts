/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IToasts, FatalErrorsSetup } from 'src/core/public';

let _toasts: IToasts;
let _fatalErrors: FatalErrorsSetup;

export const init = (toasts: IToasts, fatalErrors: FatalErrorsSetup) => {
  _toasts = toasts;
  _fatalErrors = fatalErrors;
};

export const getToasts = () => _toasts;
export const getFatalErrors = () => _fatalErrors;
