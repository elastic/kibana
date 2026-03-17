/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { ALL_USERS, USERS } from './common/users';
import { ALL_ROLES } from './common/roles';
import { createUsersAndRoles, deleteUsersAndRoles } from './common/helpers';

const API_PATH = '/internal/search_inference_endpoints/features';
const API_VERSION = '1' as const;

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('inference_features - /internal/search_inference_endpoints/features', function () {
    before(async () => {
      await createUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });

    describe('authorized user', function () {
      it('should return 200 with registered features', async () => {
        const { body } = await supertestWithoutAuth
          .get(API_PATH)
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

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

    describe('feature-privileged user', function () {
      it('should return 200 with features', async () => {
        const { body } = await supertestWithoutAuth
          .get(API_PATH)
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.FEATURE.username, USERS.FEATURE.password)
          .expect(200);

        expect(Array.isArray(body.features)).toBe(true);
        expect(body.features.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe('unauthorized user', function () {
      it('should return 403', async () => {
        await supertestWithoutAuth
          .get(API_PATH)
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .expect(403);
      });
    });
  });
}
