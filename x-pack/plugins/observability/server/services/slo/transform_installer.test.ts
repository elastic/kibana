/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ElasticsearchClient } from '@kbn/core/server';
import { MockedLogger } from '@kbn/logging-mocks';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';

import { TransformInstaller } from './transform_installer';
import {
  ApmTransactionErrorRateTransformGenerator,
  TransformGenerator,
} from './transform_generators';
import { SLO, SLITypes } from '../../types/models';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';

describe('TransformerGenerator', () => {
  let esClientMock: jest.Mocked<ElasticsearchClient>;
  let loggerMock: jest.Mocked<MockedLogger>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  describe('Unhappy path', () => {
    it('throws when no generator exists for the slo indicator type', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<SLITypes, TransformGenerator> = {
        'slo.apm.transaction_duration': new DummyTransformGenerator(),
      };
      const service = new TransformInstaller(generators, esClientMock, loggerMock);

      expect(() =>
        service.installAndStartTransform(
          createSLO({
            type: 'slo.apm.transaction_error_rate',
            params: {
              environment: 'irrelevant',
              service: 'irrelevant',
              transaction_name: 'irrelevant',
              transaction_type: 'irrelevant',
            },
          })
        )
      ).rejects.toThrowError('Unsupported SLO type: slo.apm.transaction_error_rate');
    });

    it('throws when transform generator fails', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<SLITypes, TransformGenerator> = {
        'slo.apm.transaction_duration': new FailTransformGenerator(),
      };
      const service = new TransformInstaller(generators, esClientMock, loggerMock);

      expect(() =>
        service.installAndStartTransform(
          createSLO({
            type: 'slo.apm.transaction_duration',
            params: {
              environment: 'irrelevant',
              service: 'irrelevant',
              transaction_name: 'irrelevant',
              transaction_type: 'irrelevant',
              'threshold.us': 250000,
            },
          })
        )
      ).rejects.toThrowError('Some error');
    });
  });

  it('installs and starts the transform', async () => {
    // @ts-ignore defining only a subset of the possible SLI
    const generators: Record<SLITypes, TransformGenerator> = {
      'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
    };
    const service = new TransformInstaller(generators, esClientMock, loggerMock);

    await service.installAndStartTransform(createSLO(createAPMTransactionErrorRateIndicator()));

    expect(esClientMock.transform.putTransform).toHaveBeenCalledTimes(1);
    expect(esClientMock.transform.startTransform).toHaveBeenCalledTimes(1);
  });
});

class DummyTransformGenerator implements TransformGenerator {
  getTransformParams(slo: SLO): TransformPutTransformRequest {
    return {} as TransformPutTransformRequest;
  }
}

class FailTransformGenerator implements TransformGenerator {
  getTransformParams(slo: SLO): TransformPutTransformRequest {
    throw new Error('Some error');
  }
}
