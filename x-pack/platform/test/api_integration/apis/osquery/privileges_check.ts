/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { API_VERSIONS } from '@kbn/osquery-plugin/common/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Privileges check', () => {
    it('returns true for superuser with full index access', async () => {
      const response = await supertest
        .get('/internal/osquery/privileges_check')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', API_VERSIONS.internal.v1);

      expect(response.status).to.be(200);
      expect(response.text).to.be('true');
    });
  });
}
