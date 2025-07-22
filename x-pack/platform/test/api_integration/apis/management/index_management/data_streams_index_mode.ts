/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_BASE_PATH } from './constants';
import { datastreamsHelpers } from './lib/datastreams.helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esVersion = getService('esVersion');

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

    describe('index mode of logs-*-* data streams', () => {
      const logsdbDataStreamName = 'logs-test-ds';

      before(async () => {
        await createDataStream(logsdbDataStreamName);
      });

      after(async () => {
        await deleteDataStream(logsdbDataStreamName);
      });

      const logsdbSettings: Array<{
        enabled: boolean | null;
        prior_logs_usage: boolean;
        indexMode: string;
      }> = [
        { enabled: true, prior_logs_usage: true, indexMode: 'logsdb' },
        { enabled: false, prior_logs_usage: true, indexMode: 'standard' },
        // In stateful Kibana, when cluster.logsb.enabled setting is not set, the index mode is always standard
        // For versions 9.0+, if prior_logs_usage is set to false, the cluster.logsdb.enabled setting is true by default, so logsdb index mode
        { enabled: null, prior_logs_usage: true, indexMode: 'standard' },
        {
          enabled: null,
          prior_logs_usage: false,
          indexMode: esVersion.matchRange('>=9.0.0') ? 'logsdb' : 'standard',
        },
      ];

      // eslint-disable-next-line @typescript-eslint/naming-convention
      logsdbSettings.forEach(({ enabled, prior_logs_usage, indexMode }) => {
        it(`returns ${indexMode} index mode if logsdb.enabled setting is ${enabled} and logs.prior_logs_usage is ${prior_logs_usage}`, async () => {
          await es.cluster.putSettings({
            persistent: {
              cluster: {
                logsdb: {
                  enabled,
                },
              },
              logsdb: {
                prior_logs_usage,
              },
            },
          });

          const { body: dataStream } = await supertest
            .get(`${API_BASE_PATH}/data_streams/${logsdbDataStreamName}`)
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          expect(dataStream.indexMode).to.eql(indexMode);
        });
      });
    });
  });
}
