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

const API_PATH = '/internal/search_inference_endpoints/settings';
const API_VERSION = '1' as const;

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const spacesService = getService('spaces');

  describe('inference_settings - /internal/search_inference_endpoints/settings', function () {
    before(async () => {
      await createUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, ALL_USERS, ALL_ROLES);
    });

    describe('authorized user', function () {
      describe('GET settings', function () {
        it('should return empty defaults when no settings exist', async () => {
          const { body } = await supertestWithoutAuth
            .get(API_PATH)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body).toBeDefined();
          expect(body._meta).toBeDefined();
          expect(body._meta.id).toBe('default');
          expect(body.data).toBeDefined();
          expect(body.data.features).toEqual([]);
        });
      });

      describe('PUT settings', function () {
        afterEach(async () => {
          await supertestWithoutAuth
            .put(API_PATH)
            .send({ features: [] })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);
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

          const { body } = await supertestWithoutAuth
            .put(API_PATH)
            .send(settings)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

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

          await supertestWithoutAuth
            .put(API_PATH)
            .send(initialSettings)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          const updatedSettings = {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-4.6-opus' }] },
              { feature_id: 'attack_discovery', endpoints: [{ id: '.eis-claude-3.7-sonnet' }] },
            ],
          };

          const { body } = await supertestWithoutAuth
            .put(API_PATH)
            .send(updatedSettings)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body.data.features).toEqual(updatedSettings.features);
        });

        it('should persist settings across GET requests', async () => {
          const settings = {
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
              { feature_id: 'attack_discovery', endpoints: [{ id: '.eis-claude-3.7-sonnet' }] },
            ],
          };

          await supertestWithoutAuth
            .put(API_PATH)
            .send(settings)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          const { body } = await supertestWithoutAuth
            .get(API_PATH)
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(200);

          expect(body.data.features).toEqual(settings.features);
        });
      });

      describe('validation', function () {
        it('should reject duplicate feature_id values', async () => {
          await supertestWithoutAuth
            .put(API_PATH)
            .send({
              features: [
                { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-a' }] },
                { feature_id: 'agent_builder', endpoints: [{ id: '.endpoint-b' }] },
              ],
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(400);
        });

        it('should reject duplicate endpoints within a feature', async () => {
          await supertestWithoutAuth
            .put(API_PATH)
            .send({
              features: [
                {
                  feature_id: 'agent_builder',
                  endpoints: [{ id: '.endpoint-a' }, { id: '.endpoint-a' }],
                },
              ],
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(400);
        });

        it('should reject empty feature_id', async () => {
          await supertestWithoutAuth
            .put(API_PATH)
            .send({
              features: [{ feature_id: '', endpoints: [{ id: '.endpoint-a' }] }],
            })
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(400);
        });

        it('should reject missing features field', async () => {
          await supertestWithoutAuth
            .put(API_PATH)
            .send({})
            .set('kbn-xsrf', 'xxx')
            .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
            .auth(USERS.ALL.username, USERS.ALL.password)
            .expect(400);
        });
      });
    });

    describe('feature-privileged user', function () {
      afterEach(async () => {
        await supertestWithoutAuth
          .put(API_PATH)
          .send({ features: [] })
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.FEATURE.username, USERS.FEATURE.password)
          .expect(200);
      });

      it('GET should return 200', async () => {
        const { body } = await supertestWithoutAuth
          .get(API_PATH)
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.FEATURE.username, USERS.FEATURE.password)
          .expect(200);

        expect(body.data).toBeDefined();
      });

      it('PUT should return 200', async () => {
        const settings = {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        };

        const { body } = await supertestWithoutAuth
          .put(API_PATH)
          .send(settings)
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.FEATURE.username, USERS.FEATURE.password)
          .expect(200);

        expect(body.data.features).toEqual(settings.features);
      });
    });

    describe('unauthorized user', function () {
      it('GET should return 403', async () => {
        await supertestWithoutAuth
          .get(API_PATH)
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .expect(403);
      });

      it('PUT should return 403', async () => {
        await supertestWithoutAuth
          .put(API_PATH)
          .send({
            features: [
              { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
            ],
          })
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.NO_ACCESS.username, USERS.NO_ACCESS.password)
          .expect(403);
      });
    });

    describe('space isolation', function () {
      const SPACE_A = 'inference-test-space-a';
      const SPACE_B = 'inference-test-space-b';

      const spaceApiPath = (spaceId: string) => `/s/${spaceId}${API_PATH}`;

      before(async () => {
        await spacesService.create({ id: SPACE_A, name: 'Space A', disabledFeatures: [] });
        await spacesService.create({ id: SPACE_B, name: 'Space B', disabledFeatures: [] });
      });

      after(async () => {
        await spacesService.delete(SPACE_A);
        await spacesService.delete(SPACE_B);
      });

      afterEach(async () => {
        await supertestWithoutAuth
          .put(spaceApiPath(SPACE_A))
          .send({ features: [] })
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        await supertestWithoutAuth
          .put(spaceApiPath(SPACE_B))
          .send({ features: [] })
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);
      });

      it('settings saved in one space should not be visible in another', async () => {
        const settingsA = {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        };

        await supertestWithoutAuth
          .put(spaceApiPath(SPACE_A))
          .send(settingsA)
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        const { body } = await supertestWithoutAuth
          .get(spaceApiPath(SPACE_B))
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        expect(body.data.features).toEqual([]);
      });

      it('settings saved in one space should be readable from the same space', async () => {
        const settingsA = {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        };

        await supertestWithoutAuth
          .put(spaceApiPath(SPACE_A))
          .send(settingsA)
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        const { body } = await supertestWithoutAuth
          .get(spaceApiPath(SPACE_A))
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        expect(body.data.features).toEqual(settingsA.features);
      });

      it('each space should maintain its own independent settings', async () => {
        const settingsA = {
          features: [
            { feature_id: 'agent_builder', endpoints: [{ id: '.anthropic-claude-3.7-sonnet' }] },
          ],
        };

        const settingsB = {
          features: [
            { feature_id: 'attack_discovery', endpoints: [{ id: '.eis-claude-3.7-sonnet' }] },
          ],
        };

        await supertestWithoutAuth
          .put(spaceApiPath(SPACE_A))
          .send(settingsA)
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        await supertestWithoutAuth
          .put(spaceApiPath(SPACE_B))
          .send(settingsB)
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        const { body: bodyA } = await supertestWithoutAuth
          .get(spaceApiPath(SPACE_A))
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        const { body: bodyB } = await supertestWithoutAuth
          .get(spaceApiPath(SPACE_B))
          .set('kbn-xsrf', 'xxx')
          .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSION)
          .auth(USERS.ALL.username, USERS.ALL.password)
          .expect(200);

        expect(bodyA.data.features).toEqual(settingsA.features);
        expect(bodyB.data.features).toEqual(settingsB.features);
      });
    });
  });
}
