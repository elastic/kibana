/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('EPM - ilm', () => {
    it('setup policy', async () => {
      const policyName = 'foo';
      const es = getService('es');
      const policy = {
        policy: {
          phases: {
            hot: {
              actions: {
                rollover: {
                  max_size: '50gb',
                  max_age: '30d',
                },
              },
            },
          },
        },
      };

      const data = await es.transport.request<any>(
        {
          method: 'PUT',
          path: '/_ilm/policy/' + policyName,
          body: policy,
        },
        { meta: true }
      );

      expect(data.body.acknowledged).to.eql(true);
      expect(data.statusCode).to.eql(200);
    });
  });
}
