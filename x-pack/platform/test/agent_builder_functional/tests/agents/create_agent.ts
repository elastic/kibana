/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { onechat } = getPageObjects(['onechat']);
  describe('Create agent', function () {
    it('should create an agent', async function () {
      const salt = Date.now();
      const id = `test_agent_${salt}`;
      const name = `Test Agent ${salt}`;
      const labels = ['one', 'two', 'three'];
      await onechat.createAgentViaUI({ id, name, labels });
      await onechat.agentExistsOrFail(id);
      expect(await onechat.getAgentLabels(id)).to.eql(labels);
    });
  });
}
