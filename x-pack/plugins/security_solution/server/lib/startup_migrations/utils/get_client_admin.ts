/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, SavedObjectsClientContract } from 'kibana/server';
import { getFakeKibanaRequest } from './get_fake_kibana_request';

export const getClientAdmin = (core: CoreStart): SavedObjectsClientContract => {
  const fakeRequest = getFakeKibanaRequest(core.http.basePath.serverBasePath);
  return core.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: ['alert', 'action'],
    excludedWrappers: ['security'],
  });
};
