/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default function indexTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('index action', () => {
    it('should return 200 when creating an index action', async () => {
      // create action with no config
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          actionTypeId: '.index',
          config: {
            index: 'foo',
          },
          secrets: {},
        })
        .expect(200);
    });
  });
}
