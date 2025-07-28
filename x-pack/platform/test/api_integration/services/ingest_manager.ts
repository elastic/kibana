/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, fleetSetupRouteService } from '@kbn/fleet-plugin/common';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FtrProviderContext } from '../ftr_provider_context';

export function IngestManagerProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  return {
    async setup() {
      const headers = { accept: 'application/json', 'kbn-xsrf': 'some-xsrf-token' };

      await retry.try(async () => {
        await supertest
          .post(fleetSetupRouteService.postFleetSetupPath())
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
          .set(headers)
          .send({ forceRecreate: true })
          .expect(200);
      });
    },
  };
}
