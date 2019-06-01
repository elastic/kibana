/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let i18n: any;
export let FormattedMessage: any;

export function init(_i18n: any, _FormattedMessage: any): void {
  i18n = _i18n;
  FormattedMessage = _FormattedMessage;
}
