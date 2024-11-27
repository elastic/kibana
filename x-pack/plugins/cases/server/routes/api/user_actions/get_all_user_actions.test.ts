/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUserActionsRoute } from './get_all_user_actions';
import { docLinksServiceMock } from '@kbn/core/server/mocks';

describe('getUserActionsRoute', () => {
  const docLinks = docLinksServiceMock.createSetupContract();

  it('marks the endpoint internal in serverless', async () => {
    const router = getUserActionsRoute({ isServerless: true, docLinks });

    expect(router.routerOptions?.access).toBe('internal');
    expect(router.routerOptions?.deprecated).toMatchInlineSnapshot(
      {
        documentationUrl: expect.stringMatching(/#breaking-201004$/),
      },
      `
      Object {
        "documentationUrl": StringMatching /#breaking-201004\\$/,
        "reason": Object {
          "newApiMethod": "GET",
          "newApiPath": "/api/cases/<case_id>/user_actions/_find",
          "type": "migrate",
        },
        "severity": "warning",
      }
    `
    );
  });

  it('marks the endpoint public in non-serverless', async () => {
    const router = getUserActionsRoute({ isServerless: false, docLinks });

    expect(router.routerOptions?.access).toBe('public');
  });
});
