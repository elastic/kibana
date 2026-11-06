/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  API_VERSIONS,
  INBOX_ACTIONS_URL,
  buildRespondToActionUrl,
  type ListInboxActionsResponse,
} from '@kbn/inbox-common';
import type { FtrProviderContext } from '../ftr_provider_context';

/**
 * Contract-level coverage for the Inbox HTTP API. The suite runs against a
 * clean stateful Kibana — no providers register automatic actions in this
 * FTR harness, so the registry is empty unless/until the live Workflows
 * lifecycle test below is re-enabled.
 *
 * What's covered here:
 *  - Empty-registry list behavior (200 with `{ actions: [], total: 0 }`)
 *  - Query-parameter validation (400 on bogus `status`, `page=0`)
 *  - Respond route 404 when `source_app` isn't registered
 *  - Respond route 400 when `input` is missing
 *
 * What's NOT covered here (see the skipped suite below):
 *  - Full round-trip through the Workflows provider. That requires creating
 *    a workflow, triggering it, and polling until `waiting_for_input`.
 *    Wiring that through the stateful FTR needs the Workflows execution
 *    engine running against real task manager; we don't currently have
 *    a lightweight harness for it here.
 */
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // FTR's mocha decorator requires each test file to expose exactly ONE
  // top-level describe — splitting the contract suite and the live-flow
  // suite into siblings here would fail the loader at runtime.
  describe('Inbox API integration', () => {
    describe('contract', () => {
      it('returns an empty list when no providers have registered actions', async () => {
        const { body } = await supertest
          .get(INBOX_ACTIONS_URL)
          .set('elastic-api-version', API_VERSIONS.internal.v1)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        const response = body as ListInboxActionsResponse;
        expect(response.total).to.be(0);
        expect(response.actions).to.eql([]);
      });

      it('rejects invalid query params', async () => {
        await supertest
          .get(`${INBOX_ACTIONS_URL}?page=0`)
          .set('elastic-api-version', API_VERSIONS.internal.v1)
          .set('kbn-xsrf', 'foo')
          .expect(400);
        await supertest
          .get(`${INBOX_ACTIONS_URL}?status=fake`)
          .set('elastic-api-version', API_VERSIONS.internal.v1)
          .set('kbn-xsrf', 'foo')
          .expect(400);
      });

      it('returns 404 when responding against an unregistered source_app', async () => {
        await supertest
          .post(buildRespondToActionUrl('does-not-exist', 'whatever'))
          .set('elastic-api-version', API_VERSIONS.internal.v1)
          .set('kbn-xsrf', 'foo')
          .send({ input: {} })
          .expect(404);
      });

      it('returns 400 when the body is missing the required `input` key', async () => {
        await supertest
          .post(buildRespondToActionUrl('workflows', 'anything'))
          .set('elastic-api-version', API_VERSIONS.internal.v1)
          .set('kbn-xsrf', 'foo')
          .send({})
          .expect(400);
      });
    });

    /**
     * Full live-workflow lifecycle. Skipped until this suite gets a harness
     * that can boot the Workflows execution engine, poll for
     * `waiting_for_input`, and assert the Inbox provider round-trip.
     *
     * When re-enabled, the body should:
     *  1. POST `/api/workflows/workflow` with a YAML definition containing a
     *     `waitForInput` step + schema.
     *  2. POST `/api/workflows/workflow/{id}/run` and capture the execution id.
     *  3. Poll `GET /internal/inbox/actions` until `source_app: 'workflows'`
     *     surfaces with the composite `source_id`.
     *  4. POST `/internal/inbox/actions/workflows/{source_id}/respond` with a
     *     schema-valid body and assert the step completes with that input.
     */
    describe.skip('live-workflow flow', () => {
      it('surfaces a paused waitForInput step and resumes it via respond', () => {
        // See describe-level comment for the expected implementation.
      });
    });
  });
}
