/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NotificationsSetup, FatalErrorsSetup } from '@kbn/core/public';

export let toasts: NotificationsSetup['toasts'];
export let fatalError: FatalErrorsSetup;

export function init(_toasts: NotificationsSetup['toasts'], _fatalError: FatalErrorsSetup): void {
  toasts = _toasts;
  fatalError = _fatalError;
}
