/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { SECURITY_EXTENSION_ID, type CoreStart, SavedObjectsClient } from '@kbn/core/server';
import { brandSpaceId } from '@kbn/core-spaces-common';

export async function getInternalSavedObjectsClient(coreStart: CoreStart) {
  return new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());
}

export function getInternalSavedObjectsClientForSpaceId(coreStart: CoreStart, spaceId?: string) {
  const request = kibanaRequestFactory({
    headers: {},
    route: { settings: {} },
    url: { href: '', hash: '' } as URL,
    raw: { req: { url: '/' } } as any,
    spaceId: spaceId ? brandSpaceId(spaceId) : undefined,
  });

  // soClient as kibana internal users, be careful on how you use it, security is not enabled
  return coreStart.savedObjects.getScopedClient(request, {
    excludedExtensions: [SECURITY_EXTENSION_ID],
  });
}
