/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/snapshot_restore';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const deployment = getService('deployment');

  describe('snapshot repositories', function () {
    describe('repository types', () => {
      it('returns a list of default repository types', async () => {
        const { body } = await supertest.get(`${API_BASE_PATH}/repository_types`).expect(200);

        const isCloud = await deployment.isCloud();
        if (isCloud) {
          // on Cloud there are only module repo types
          expect(body).to.eql(['azure', 'gcs', 's3']);
        } else {
          // on prem there are module repo types and file system and url repo types
          expect(body).to.eql(['azure', 'gcs', 's3', 'fs', 'url']);
        }
      });
    });
  });
}
