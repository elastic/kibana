/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  /**
   * Internal unified types are registered in
   * x-pack/platform/plugins/shared/cases/server/internal_attachments/index.ts
   */
  describe('Unified attachment types', () => {
    describe('check registered unified attachment types', () => {
      const getRegisteredTypes = () => {
        return supertest
          .get('/api/cases_fixture/registered_unified_attachments')
          .expect(200)
          .then((response) => response.body);
      };

      it('should check changes on all registered unified attachment types', async () => {
        const types = await getRegisteredTypes();

        expect(types).to.eql({
          lens: '45d27f9672c86ca48baf24ef1b04d4802555aee2',
          comment: '118a9989815489c24b81b160782015890ed2085e',
          'security.event': '0337735d3e57178e44b426e41e616aae57fd794d',
        });
      });
    });
  });
};
