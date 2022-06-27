/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { getArchiveEntry } from '../../archive/cache';

import { prepareToInstallPipelines } from './install';

jest.mock('../../archive/cache');

const mockedGetArchiveEntry = getArchiveEntry as jest.MockedFunction<typeof getArchiveEntry>;

describe('Install pipeline tests', () => {
  describe('prepareToInstallPipelines', () => {
    it('should work with datastream without ingest pipeline define in the package', async () => {
      const res = prepareToInstallPipelines(
        {
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'datasettest',
              type: 'logs',
              package: 'packagetest',
              path: '/datasettest',
            },
          ],
        } as any,
        []
      );

      expect(res.assetsToAdd).toEqual([{ id: 'logs-datasettest-1.0.0', type: 'ingest_pipeline' }]);
      const esClient = elasticsearchClientMock.createInternalClient();
      const logger = loggerMock.create();
      await res.install(esClient, logger);

      expect(esClient.ingest.putPipeline).toBeCalled();
    });

    it('should work with datastream with ingest pipelines define in the package', async () => {
      const res = prepareToInstallPipelines(
        {
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'datasettest',
              type: 'logs',
              package: 'packagetest',
              path: 'datasettest',
              ingest_pipeline: 'default',
            },
          ],
        } as any,
        [
          'packagetest-1.0.0/data_stream/datasettest/elasticsearch/ingest_pipeline/default.yml',
          'packagetest-1.0.0/data_stream/datasettest/elasticsearch/ingest_pipeline/standard.yml',
        ]
      );
      expect(res.assetsToAdd).toEqual([
        { id: 'logs-datasettest-1.0.0', type: 'ingest_pipeline' },
        { id: 'logs-datasettest-1.0.0-standard', type: 'ingest_pipeline' },
      ]);

      const esClient = elasticsearchClientMock.createInternalClient();
      const logger = loggerMock.create();

      mockedGetArchiveEntry.mockReturnValue(Buffer.from(`description: test`));

      await res.install(esClient, logger);

      expect(esClient.ingest.putPipeline).toBeCalledTimes(2);
    });
  });
});
