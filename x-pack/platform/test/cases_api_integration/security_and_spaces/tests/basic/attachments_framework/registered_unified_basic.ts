/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const getRegisteredPersistableStateTypes = () => {
    return supertest
      .get('/api/cases_fixture/registered_persistable_state_attachments')
      .expect(200)
      .then((response) => response.body);
  };

  const getRegisteredUnifiedTypes = () => {
    return supertest
      .get('/api/cases_fixture/registered_unified_attachments')
      .expect(200)
      .then((response) => response.body);
  };

  /**
   * Attachment types are being registered in
   * x-pack/platform/test/cases_api_integration/common/plugins/cases/server/plugin.ts
   */
  describe('Attachment registries', () => {
    // This test is intended to fail when new persistable state attachment types are registered.
    // To resolve, add the new persistable state attachment types ID to this list. This will trigger
    // a CODEOWNERS review by Response Ops.
    describe('check registered persistable state attachment types', () => {
      it('should check changes on all registered persistable state attachment types', async () => {
        const types = await getRegisteredPersistableStateTypes();

        expect(types).to.eql({
          '.test': 'ab2204830c67f5cf992c9aa2f7e3ead752cc60a1',
        });
      });
    });

    describe('check registered unified attachment types', () => {
      it('should check changes on all registered unified attachment types for a basic license', async () => {
        const types = await getRegisteredUnifiedTypes();

        expect(types).to.eql({
          lens: '45d27f9672c86ca48baf24ef1b04d4802555aee2',
          comment: '118a9989815489c24b81b160782015890ed2085e',
          'security.endpoint': '16a05a198eed9dda49ac2997921142b7b6b602d9',
          'security.event': '0337735d3e57178e44b426e41e616aae57fd794d',
        });
      });
    });
  });
};
