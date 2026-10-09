/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import expect from '@kbn/expect';
import type { SupertestWithRoleScopeType } from '../../services';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { painlessErrReq } from './painless_err_req';
import { verifyErrorResponse } from './verify_error';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

  // Migration recommendation: MIXED. See individual tests.
  // Serverless copy of src/platform/test/api_integration/apis/search/search.ts; condense into one Scout API test
  // tagged `tags.deploymentAgnostic`.
  describe('search', () => {
    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
          withCustomHeaders: {
            [ELASTIC_HTTP_VERSION_HEADER]: '1',
          },
        }
      );
      // TODO: emptyKibanaIndex fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // so it was switched to `savedObjects.cleanStandardList()`
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
    });

    describe('post', () => {
      // MIGRATE TO SCOUT (API)
      // This and the terminated-early test need real ES.
      // Target: src/platform/plugins/shared/data/test/scout/api/tests/search/es_post_sync.spec.ts (new, `tags.deploymentAgnostic`)
      it('should return 200 when correctly formatted searches are provided', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/search/es`)
          .send({
            params: {
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);

        expect(resp.status).to.be(200);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body).to.have.property('rawResponse');
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      // MIGRATE TO SCOUT (API)
      // Needs real ES: sets `terminateAfter` and asserts `rawResponse.terminated_early === true`.
      // Target: src/platform/plugins/shared/data/test/scout/api/tests/search/es_post_sync.spec.ts (new, `tags.deploymentAgnostic`)
      it('should return 200 if terminated early', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/search/es`)
          .send({
            params: {
              terminateAfter: 1,
              index: 'log*',
              size: 1000,
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(200);

        expect(resp.status).to.be(200);
        expect(resp.body.isPartial).to.be(false);
        expect(resp.body.isRunning).to.be(false);
        expect(resp.body.rawResponse.terminated_early).to.be(true);
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      // DELETE (no replacement needed)
      // `POST /internal/search` is an unregistered path, so the 404 is framework behaviour.
      it('should return 404 when if no strategy is provided', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/search`)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404);

        verifyErrorResponse(resp.body, 404);
      });

      // REPLACE WITH UNIT/JEST
      // The 404 and its message come from `getSearchStrategy` in search_service.ts, which
      // search_service.test.ts does not cover. Target: src/platform/plugins/shared/data/server/search/search_service.test.ts
      it('should return 404 when if unknown strategy is provided', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/search/banana`)
          .send({
            body: {
              query: {
                match_all: {},
              },
            },
          })
          .expect(404);

        verifyErrorResponse(resp.body, 404);
        expect(resp.body.message).to.contain('banana not found');
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });

      // MIGRATE TO SCOUT (API)
      // Depends on the real ES error shape.
      // Target: src/platform/plugins/shared/data/test/scout/api/tests/search/es_post_sync.spec.ts (new, `tags.deploymentAgnostic`)
      it('should return 400 with illegal ES argument', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/search/es`)
          .send({
            params: {
              timeout: 1, // This should be a time range string!
              index: 'log*',
              size: 1000,
              body: {
                query: {
                  match_all: {},
                },
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'illegal_argument_exception', true);
      });

      // MIGRATE TO SCOUT (API)
      // Scout's 'bad body' case in ese_post_sync.spec.ts uses the `ese` strategy, not `es`; cover `es`
      // in the new es_post_sync.spec.ts before deleting.
      // Target: src/platform/plugins/shared/data/test/scout/api/tests/search/es_post_sync.spec.ts (new, `tags.deploymentAgnostic`)
      it('should return 400 with a bad body', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/search/es`)
          .send({
            params: {
              body: {
                index: 'nope nope',
                bad_query: [],
              },
            },
          })
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'parsing_exception', true);
      });

      // MIGRATE TO SCOUT (API)
      // Only this checks real ES returns `search_phase_execution_exception` for a script error; the
      // Jest test in search.test.ts mocks the ES error.
      // Target: src/platform/plugins/shared/data/test/scout/api/tests/search/es_post_sync.spec.ts (new, `tags.deploymentAgnostic`)
      it('should return 400 for a painless error', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .post(`/internal/search/es`)
          .send(painlessErrReq)
          .expect(400);

        verifyErrorResponse(resp.body, 400, 'search_phase_execution_exception', true);
      });
    });

    describe('delete', () => {
      // ALREADY COVERED - PORT GAP, THEN DELETE
      // The 404 comes from the router (no id segment), not the strategy; Scout covers it with `ese` in
      // data/test/scout/api/tests/search/ese_delete.spec.ts ('404 when no search id provided'), but only
      // asserts the status. This test also runs `verifyErrorResponse(body, 404)`: add that body check to
      // the Scout test before deleting.
      it('should return 404 when no search id provided', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .delete(`/internal/search/es`)
          .send()
          .expect(404);
        verifyErrorResponse(resp.body, 404);
      });

      // REPLACE WITH UNIT/JEST
      // Not covered by Scout (its delete spec uses the `ese` strategy) nor by search.test.ts. The
      // message comes from search_service.ts, so add a case to a Jest test there.
      // Target: src/platform/plugins/shared/data/server/search/search_service.test.ts
      it('should return 400 when trying a delete on a non supporting strategy', async () => {
        const resp = await supertestAdminWithCookieCredentials
          .delete(`/internal/search/es/123`)
          .send()
          .expect(400);
        verifyErrorResponse(resp.body, 400);
        expect(resp.body.message).to.contain("Search strategy es doesn't support cancellations");
        expect(resp.header).to.have.property(ELASTIC_HTTP_VERSION_HEADER, '1');
      });
    });
  });
}
