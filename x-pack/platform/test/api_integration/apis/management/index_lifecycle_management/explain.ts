/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { API_BASE_PATH } from './constants';
import { getRandomString } from './lib/random';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('explain', () => {
    describe('GET /explain', () => {
      it('should include hidden indices in the explain response', async () => {
        const indexName = `.hidden_ilm_explain_${getRandomString()}`;

        try {
          await es.indices.create({
            index: indexName,
            settings: {
              hidden: true,
            },
          });

          const { body } = await supertest.get(`${API_BASE_PATH}/explain`).expect(200);

          expect(Object.keys(body.indices)).to.contain(indexName);
        } finally {
          await esDeleteAllIndices([indexName]);
        }
      });
    });
  });
}
