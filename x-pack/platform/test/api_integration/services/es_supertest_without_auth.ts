/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';

import { FtrProviderContext } from '../ftr_provider_context';

/**
 * Supertest provider that doesn't include user credentials into base URL that is passed
 * to the supertest.
 */
export function EsSupertestWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const elasticsearchServerConfig = config.get('servers.elasticsearch');

  return supertest(
    formatUrl({
      ...elasticsearchServerConfig,
      auth: false,
    })
  );
}
