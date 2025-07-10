/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { INTERNAL_API_BASE_PATH } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { sortedExpectedIndexKeys } from './constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const createIndex = async (name: string) => {
    await es.indices.create({ index: name });
  };

  const testIndex = 'test_index';
  describe('index details', () => {
    before(async () => {
      await createIndex(testIndex);
    });
    after(async () => {
      await esDeleteAllIndices([testIndex]);
    });

    it('returns index details', async () => {
      const { body: index } = await supertest
        .get(`${INTERNAL_API_BASE_PATH}/indices/${testIndex}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const sortedReceivedKeys = Object.keys(index).sort();

      expect(sortedReceivedKeys).to.eql(sortedExpectedIndexKeys);
    });

    it(`throws 404 when index doesn't exist`, async () => {
      await supertest
        .get(`${INTERNAL_API_BASE_PATH}/indices/non_existent`)
        .set('kbn-xsrf', 'xxx')
        .expect(404);
    });
  });
}
