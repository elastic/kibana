/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MaybeImmutable, NewTrustedApp } from '../../../../../common/endpoint/types';
import { defaultNewTrustedApp } from '../store/builders';

const NEW_TRUSTED_APP_KEYS: Array<keyof NewTrustedApp> = [
  'name',
  'effectScope',
  'entries',
  'description',
  'os',
];

export const toNewTrustedApp = <T extends NewTrustedApp>(
  trustedApp: MaybeImmutable<T>
): NewTrustedApp => {
  const newTrustedApp = defaultNewTrustedApp();
  for (const key of NEW_TRUSTED_APP_KEYS) {
    // This should be safe. Its needed due to the inter-dependency on property values (`os` <=> `entries`)
    // @ts-expect-error
    newTrustedApp[key] = trustedApp[key];
  }
  return newTrustedApp;
};
