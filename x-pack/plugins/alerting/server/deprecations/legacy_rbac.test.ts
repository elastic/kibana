/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetDeprecationsContext } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getLegacyRbacDeprecationsInfo } from './legacy_rbac';
import { SearchHit } from '@kbn/es-types';

let context: GetDeprecationsContext;
const esClient = elasticsearchClientMock.createScopedClusterClient();

describe('getLegacyRbacDeprecationsInfo', () => {
  beforeEach(async () => {
    context = { esClient } as unknown as GetDeprecationsContext;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('does not return deprecations when there is no legacyRBACExemption usage', async () => {
    esClient.asCurrentUser.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [],
      },
    });
    expect(await getLegacyRbacDeprecationsInfo(context)).toMatchInlineSnapshot(`Array []`);
  });

  test('does return deprecations when there is legacyRBACExemption usage', async () => {
    esClient.asCurrentUser.search.mockResponse({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [{} as SearchHit<unknown>],
      },
    });

    expect(await getLegacyRbacDeprecationsInfo(context)).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveActions": Object {
            "manualSteps": Array [
              "Look up the affected alerting rules by filtering for those that encountered action failures (via Stack Management > Rules)",
              "Update the alerting rule API key by editing the rule, so the authorization uses the normal RBAC process",
            ],
          },
          "deprecationType": "feature",
          "level": "warning",
          "message": "The legacy RBAC exemption for Alerting rules has been removed in future versions, and this cluster has alerting rules triggering actions that rely on the legacy exemption. The affected alerting rules will fail to trigger connector actions whenever alerts are found",
          "title": "Legacy RBAC exemption",
        },
      ]
    `);
  });
});
