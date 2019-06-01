/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let toastNotifications: any;
export let fatalError: any;

export function init(_toastNotifications: any, _fatalError: any): void {
  toastNotifications = _toastNotifications;
  fatalError = _fatalError;
}
