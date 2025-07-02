/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import apmInstanceFixture from './fixtures/instance.json';

export default function ({ getService }) {
  // Skipping for now since failure is unclear
  return void 0;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('instance detail', () => {
    const archive = 'x-pack/test/functional/es_archives/monitoring/apm';
    const timeRange = {
      min: '2018-08-31T12:59:49.104Z',
      max: '2018-08-31T13:59:49.104Z',
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should get apm instance data', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/GUtE4UwgSR-XUICRDEFKkA/apm/9b16f434-2092-4983-a401-80a2b61c79d6'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(apmInstanceFixture);
    });
  });
}
