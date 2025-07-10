/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function enabledRuleTypesTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('enabled_rule_types', () => {
    it('should only find rule types explicitly enabled in config', async () => {
      const registeredRuleTypes = await supertest
        .get('/api/alerts_fixture/registered_rule_types')
        .expect(200)
        .then((response) => response.body);

      expect(registeredRuleTypes).to.eql(['test.noop', 'test.gold.noop']);
    });
  });
}
