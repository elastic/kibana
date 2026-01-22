/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  describe('Create agent', function () {
    it('should create an agent', async function () {
      const salt = Date.now();
      const id = `test_agent_${salt}`;
      const name = `Test Agent ${salt}`;
      const labels = ['one', 'two', 'three'];
      await agentBuilder.createAgentViaUI({ id, name, labels });
      await agentBuilder.agentExistsOrFail(id);
      expect(await agentBuilder.getAgentLabels(id)).to.eql(labels);
    });
  });
}
