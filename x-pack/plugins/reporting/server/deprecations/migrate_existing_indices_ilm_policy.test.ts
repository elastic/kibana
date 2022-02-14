/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDeprecationsContext } from 'src/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import { ReportingCore } from '../core';
import { createMockConfigSchema, createMockReportingCore } from '../test_helpers';

import { getDeprecationsInfo } from './migrate_existing_indices_ilm_policy';

type ScopedClusterClientMock = ReturnType<
  typeof elasticsearchServiceMock.createScopedClusterClient
>;

describe("Migrate existing indices' ILM policy deprecations", () => {
  let esClient: ScopedClusterClientMock;
  let deprecationsCtx: GetDeprecationsContext;
  let reportingCore: ReportingCore;

  beforeEach(async () => {
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    deprecationsCtx = { esClient, savedObjectsClient: savedObjectsClientMock.create() };
    reportingCore = await createMockReportingCore(createMockConfigSchema());
  });

  const createIndexSettings = (lifecycleName: string) => ({
    aliases: {},
    mappings: {},
    settings: {
      index: {
        lifecycle: {
          name: lifecycleName,
        },
      },
    },
  });

  it('returns deprecation information when reporting indices are not using the reporting ILM policy', async () => {
    esClient.asInternalUser.indices.getSettings.mockResponse({
      indexA: createIndexSettings('not-reporting-lifecycle'),
      indexB: createIndexSettings('kibana-reporting'),
    });

    expect(await getDeprecationsInfo(deprecationsCtx, { reportingCore })).toMatchInlineSnapshot(`
      Array [
        Object {
          "correctiveActions": Object {
            "api": Object {
              "method": "PUT",
              "path": "/api/reporting/deprecations/migrate_ilm_policy",
            },
            "manualSteps": Array [
              "Update all reporting indices to use the \\"kibana-reporting\\" policy using the index settings API.",
            ],
          },
          "level": "warning",
          "message": "New reporting indices will be managed by the \\"kibana-reporting\\" provisioned ILM policy. You must edit this policy to manage the report lifecycle. This change targets all indices prefixed with \\".reporting-*\\".",
          "title": "Found reporting indices managed by custom ILM policy.",
        },
      ]
    `);
  });

  it('does not return deprecations when all reporting indices are managed by the provisioned ILM policy', async () => {
    esClient.asInternalUser.indices.getSettings.mockResponse({
      indexA: createIndexSettings('kibana-reporting'),
      indexB: createIndexSettings('kibana-reporting'),
    });

    expect(await getDeprecationsInfo(deprecationsCtx, { reportingCore })).toMatchInlineSnapshot(
      `Array []`
    );

    esClient.asInternalUser.indices.getSettings.mockResponse({});

    expect(await getDeprecationsInfo(deprecationsCtx, { reportingCore })).toMatchInlineSnapshot(
      `Array []`
    );
  });
});
