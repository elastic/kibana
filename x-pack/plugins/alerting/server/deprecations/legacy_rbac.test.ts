/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetDeprecationsContext, SavedObjectsFindResponse } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getLegacyRbacDeprecationsInfo } from './legacy_rbac';

let context: GetDeprecationsContext;

const savedObjectsClient = savedObjectsClientMock.create();

describe('getLegacyRbacDeprecationsInfo', () => {
  beforeEach(async () => {
    context = { savedObjectsClient } as unknown as GetDeprecationsContext;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('does not return deprecations when there is no legacyRBACExemption usage', async () => {
    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [],
    } as unknown as SavedObjectsFindResponse);
    expect(await getLegacyRbacDeprecationsInfo(context)).toMatchInlineSnapshot(`Array []`);
  });

  test('does return deprecations when there is legacyRBACExemption usage', async () => {
    savedObjectsClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: {
            domainId: 'test-domain-id',
            counterName: 'test',
            counterType: 'legacyRBACExemption',
            source: 'test',
            count: 2,
          },
          id: 'test-1',
        },
      ],
    } as unknown as SavedObjectsFindResponse);

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
