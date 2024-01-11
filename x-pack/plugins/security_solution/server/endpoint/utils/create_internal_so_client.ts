/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';

export const createInternalSoClient = (
  savedObjectsServiceStart: SavedObjectsServiceStart
): SavedObjectsClientContract => {
  const fakeRequest = {
    headers: {},
    getBasePath: () => '',
    path: '/',
    route: { settings: {} },
    url: { href: {} },
    raw: { req: { url: '/' } },
  } as unknown as KibanaRequest;

  return savedObjectsServiceStart.getScopedClient(fakeRequest, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
  });
};
