/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageStatsPayload } from '@kbn/telemetry-collection-manager-plugin/server';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

export interface UsageStatsPayloadTestFriendly extends UsageStatsPayload {
  // Overwriting the `object` type to a more test-friendly type
  stack_stats: Record<string, any>;
}

export interface GetTelemetryStatsOpts {
  authHeader: Record<string, string>;
}

export function UsageAPIProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  async function getTelemetryStats(
    payload: {
      unencrypted: true;
      refreshCache?: boolean;
    },
    opts?: GetTelemetryStatsOpts
  ): Promise<Array<{ clusterUuid: string; stats: UsageStatsPayloadTestFriendly }>>;
  async function getTelemetryStats(
    payload: {
      unencrypted: false;
      refreshCache?: boolean;
    },
    opts?: GetTelemetryStatsOpts
  ): Promise<Array<{ clusterUuid: string; stats: string }>>;
  async function getTelemetryStats(
    payload: {
      unencrypted?: boolean;
      refreshCache?: boolean;
    },
    opts?: GetTelemetryStatsOpts
  ): Promise<Array<{ clusterUuid: string; stats: UsageStatsPayloadTestFriendly | string }>> {
    const client = opts?.authHeader ? supertestWithoutAuth : supertest;

    const request = client
      .post('/internal/telemetry/clusters/_stats')
      .set('kbn-xsrf', 'xxx')
      .set(ELASTIC_HTTP_VERSION_HEADER, '2')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana');

    if (opts?.authHeader) {
      void request.set(opts.authHeader);
    }

    const { body } = await request.send({ refreshCache: true, ...payload }).expect(200);
    return body;
  }

  return {
    /**
     * Retrieve the stats via the private telemetry API:
     * It returns the usage in as a string encrypted blob or the plain payload if `unencrypted: false`
     *
     * @param payload Request parameters to retrieve the telemetry stats
     */
    getTelemetryStats,
  };
}
