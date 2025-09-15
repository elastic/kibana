/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';

export default function disabledRuleTypesTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // see: x-pack/platform/test/alerting_api_integration/spaces_only/tests/alerting/group4/check_registered_rule_types.ts
  describe('disabled_rule_types', () => {
    it('should not find rule types disabled in configs', async () => {
      const registeredRuleTypes = await supertest
        .get('/api/alerts_fixture/registered_rule_types')
        .expect(200)
        .then((response) => response.body);

      const ruleTypesSet = new Set(registeredRuleTypes);
      expect(!ruleTypesSet.has('siem.esqlRule'));
    });
  });
}
