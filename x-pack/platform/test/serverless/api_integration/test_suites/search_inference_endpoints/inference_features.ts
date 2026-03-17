/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { SupertestWithRoleScopeType } from '../../services';
import type { FtrProviderContext } from '../../ftr_provider_context';

const API_PATH = '/internal/search_inference_endpoints/features';
const API_VERSION = '1';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let adminSupertest: SupertestWithRoleScopeType;
  let viewerSupertest: SupertestWithRoleScopeType;

  describe('inference_features - /internal/search_inference_endpoints/features', function () {
    before(async () => {
      const supertestOptions = {
        useCookieHeader: true,
        withInternalHeaders: true,
        withCustomHeaders: { [ELASTIC_HTTP_VERSION_HEADER]: API_VERSION },
      };
      adminSupertest = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        supertestOptions
      );
      viewerSupertest = await roleScopedSupertest.getSupertestWithRoleScope(
        'viewer',
        supertestOptions
      );
    });

    describe('authorized user (admin)', function () {
      it('should return 200 with registered features', async () => {
        const { body } = await adminSupertest.get(API_PATH).expect(200);

        expect(body).toBeDefined();
        expect(Array.isArray(body.features)).toBe(true);
        expect(body.features.length).toBeGreaterThanOrEqual(2);

        const root = body.features.find(
          (f: { featureId: string }) => f.featureId === 'test_feature_root'
        );
        expect(root).toEqual(
          expect.objectContaining({
            featureId: 'test_feature_root',
            featureName: 'Test Feature Root',
            featureDescription: 'A root test feature for FTR integration tests.',
            taskType: 'chat_completion',
            recommendedEndpoints: ['test-endpoint-1', 'test-endpoint-2'],
          })
        );

        const child = body.features.find(
          (f: { featureId: string }) => f.featureId === 'test_feature_child'
        );
        expect(child).toEqual(
          expect.objectContaining({
            featureId: 'test_feature_child',
            parentFeatureId: 'test_feature_root',
            featureName: 'Test Feature Child',
            taskType: 'chat_completion',
            maxNumberOfEndpoints: 2,
            recommendedEndpoints: ['test-endpoint-1'],
          })
        );
      });
    });

    describe('unauthorized user (viewer)', function () {
      it('should return 403', async () => {
        await viewerSupertest.get(API_PATH).expect(403);
      });
    });
  });
}
