/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Test } from 'supertest';
import type { FtrProviderContext } from '../../ftr_provider_context';

const OSQUERY_PUBLIC_API_VERSION = '2023-10-31';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const withOsqueryHeaders = (request: Test) =>
    request.set('kbn-xsrf', 'true').set('elastic-api-version', OSQUERY_PUBLIC_API_VERSION);

  describe('Scheduled action results', () => {
    it('returns 200 with the expected response envelope shape', async () => {
      const response = await withOsqueryHeaders(
        supertest.get('/api/osquery/scheduled_results/non-existent-id/1')
      ).expect(200);

      expect(response.body).to.have.property('metadata');
      expect(response.body).to.have.property('edges');
      expect(response.body).to.have.property('total');
      expect(response.body).to.have.property('currentPage');
      expect(response.body).to.have.property('pageSize');
      expect(response.body).to.have.property('totalPages');
      expect(response.body).to.have.property('aggregations');
    });

    it('echoes scheduleId and executionCount back in metadata', async () => {
      const response = await withOsqueryHeaders(
        supertest.get('/api/osquery/scheduled_results/my-schedule-abc/7')
      ).expect(200);

      expect(response.body.metadata.scheduleId).to.be('my-schedule-abc');
      expect(response.body.metadata.executionCount).to.be(7);
    });

    it('defaults metadata fields to empty strings when no data exists', async () => {
      const response = await withOsqueryHeaders(
        supertest.get('/api/osquery/scheduled_results/no-data-here/1')
      ).expect(200);

      const { metadata } = response.body;
      expect(metadata.packId).to.be('');
      expect(metadata.packName).to.be('');
      expect(metadata.queryName).to.be('');
      expect(metadata.queryText).to.be('');
      expect(metadata.timestamp).to.be('');
      expect(metadata.queryInterval).to.be(undefined);
    });

    it('returns 400 when pagination exceeds the maximum allowed', async () => {
      const response = await withOsqueryHeaders(
        supertest.get('/api/osquery/scheduled_results/any-id/1?page=500&pageSize=21')
      );

      expect(response.status).to.be(400);
      expect(response.body.message).to.contain('Cannot paginate beyond');
    });

    it('accepts optional query parameters', async () => {
      await withOsqueryHeaders(
        supertest.get(
          '/api/osquery/scheduled_results/any-id/1?sort=agent_id&sortOrder=asc&page=0&pageSize=5'
        )
      ).expect(200);
    });
  });
}
