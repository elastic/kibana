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

const API_PATH = '/internal/search_inference_endpoints/settings';
const API_VERSION = '1';

export default function ({ getService }: FtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let adminSupertest: SupertestWithRoleScopeType;
  let developerSupertest: SupertestWithRoleScopeType;
  let viewerSupertest: SupertestWithRoleScopeType;

  describe('inference_settings - /internal/search_inference_endpoints/settings', function () {
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
      developerSupertest = await roleScopedSupertest.getSupertestWithRoleScope(
        'developer',
        supertestOptions
      );
      viewerSupertest = await roleScopedSupertest.getSupertestWithRoleScope(
        'viewer',
        supertestOptions
      );
    });

    describe('authorized user (admin)', function () {
      describe('GET settings', function () {
        it('should return empty defaults when no settings exist', async () => {
          const { body } = await adminSupertest.get(API_PATH).expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.id).toBe('default');
          expect(body.data).toBeDefined();
          expect(body.data.features).toEqual([]);
        });
      });

      describe('PUT settings', function () {
        afterEach(async () => {
          await adminSupertest.put(API_PATH).send({ features: [] }).expect(200);
        });

        it('should create settings', async () => {
          const settings = {
            features: [
              {
                feature_id: 'agent_builder',
                endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }],
              },
            ],
          };

          const { body } = await adminSupertest.put(API_PATH).send(settings).expect(200);

          expect(body._meta.id).toBe('default');
          expect(body._meta.createdAt).toBeDefined();
          expect(body.data.features).toEqual(settings.features);
        });

        it('should overwrite existing settings', async () => {
          const initialSettings = {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
            ],
          };

          await adminSupertest.put(API_PATH).send(initialSettings).expect(200);

          const updatedSettings = {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-4.6-opus' }] },
              { feature_id: 'attack_discovery', endpoints: [{ id: '.eis-claude-3.7-sonnet' }] },
            ],
          };

          const { body } = await adminSupertest.put(API_PATH).send(updatedSettings).expect(200);

          expect(body.data.features).toEqual(updatedSettings.features);
        });

        it('should persist settings across GET requests', async () => {
          const settings = {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
              { feature_id: 'attack_discovery', endpoints: [{ id: '.eis-claude-3.7-sonnet' }] },
            ],
          };

          await adminSupertest.put(API_PATH).send(settings).expect(200);

          const { body } = await adminSupertest.get(API_PATH).expect(200);

          expect(body.data.features).toEqual(settings.features);
        });
      });

      describe('validation', function () {
        it('should reject duplicate feature_id values', async () => {
          await adminSupertest
            .put(API_PATH)
            .send({
              features: [
                { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-a' }] },
                { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
              ],
            })
            .expect(400);
        });

        it('should reject duplicate endpoints within a feature', async () => {
          await adminSupertest
            .put(API_PATH)
            .send({
              features: [
                {
                  feature_id: 'agent_builder',
                  endpoints: [{ id: '.endpoint-a' }, { id: '.endpoint-a' }],
                },
              ],
            })
            .expect(400);
        });

        it('should reject empty feature_id', async () => {
          await adminSupertest
            .put(API_PATH)
            .send({
              features: [{ feature_id: '', endpoints: [{ id: '.endpoint-a' }] }],
            })
            .expect(400);
        });

        it('should reject missing features field', async () => {
          await adminSupertest.put(API_PATH).send({}).expect(400);
        });
      });
    });

    describe('authorized user (developer)', function () {
      afterEach(async () => {
        await developerSupertest.put(API_PATH).send({ features: [] }).expect(200);
      });

      it('GET should return 200', async () => {
        const { body } = await developerSupertest.get(API_PATH).expect(200);

        expect(body.data).toBeDefined();
      });

      it('PUT should return 200', async () => {
        const settings = {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        };

        const { body } = await developerSupertest.put(API_PATH).send(settings).expect(200);

        expect(body.data.features).toEqual(settings.features);
      });
    });

    describe('unauthorized user (viewer)', function () {
      it('GET should return 403', async () => {
        await viewerSupertest.get(API_PATH).expect(403);
      });

      it('PUT should return 403', async () => {
        await viewerSupertest
          .put(API_PATH)
          .send({
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
            ],
          })
          .expect(403);
      });
    });
  });
}
