/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';
import { API_BASE_PATH } from './constants';
import { datastreamsHelpers } from './lib/datastreams.helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  const { createDataStream, deleteDataStream } = datastreamsHelpers(getService);

  describe('Data streams index mode', function () {
    // This mutes the forward-compatibility test with Elasticsearch, 8.19 kibana and 9.0 ES.
    // They are not expected to work together since the index mode field was added to
    // the Get Data Streams API in 8.19 and 9.1, but not in 9.0.
    this.onlyEsVersion('8.19 || >=9.1');
    it('correctly returns index mode property based on index settings', async () => {
      const logsdbDataStreamName = 'logsdb-test-data-stream';
      const indexMode = 'logsdb';

      await createDataStream(logsdbDataStreamName, indexMode);

      const { body: dataStream } = await supertest
        .get(`${API_BASE_PATH}/data_streams/${logsdbDataStreamName}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(dataStream.indexMode).to.eql(indexMode);

      await deleteDataStream(logsdbDataStreamName);
    });
  });
}
