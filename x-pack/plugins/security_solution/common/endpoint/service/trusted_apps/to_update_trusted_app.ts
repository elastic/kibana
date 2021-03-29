/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaybeImmutable, NewTrustedApp, UpdateTrustedApp } from '../../types';

const NEW_TRUSTED_APP_KEYS: Array<keyof UpdateTrustedApp> = [
  'name',
  'effectScope',
  'entries',
  'description',
  'os',
  'version',
];

export const toUpdateTrustedApp = <T extends NewTrustedApp>(
  trustedApp: MaybeImmutable<T>
): UpdateTrustedApp => {
  const trustedAppForUpdate: UpdateTrustedApp = {} as UpdateTrustedApp;

  for (const key of NEW_TRUSTED_APP_KEYS) {
    // This should be safe. Its needed due to the inter-dependency on property values (`os` <=> `entries`)
    // @ts-expect-error
    trustedAppForUpdate[key] = trustedApp[key];
  }
  return trustedAppForUpdate;
};
