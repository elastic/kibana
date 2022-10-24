/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { errors as EsErrors } from '@elastic/elasticsearch';

import { DefaultTransformManager } from './transform_manager';
import {
  ApmTransactionErrorRateTransformGenerator,
  TransformGenerator,
} from './transform_generators';
import { SLO, IndicatorTypes } from '../../types/models';
import {
  createAPMTransactionDurationIndicator,
  createAPMTransactionErrorRateIndicator,
  createSLO,
} from './fixtures/slo';

describe('TransformManager', () => {
  let esClientMock: ElasticsearchClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  describe('Install', () => {
    describe('Unhappy path', () => {
      it('throws when no generator exists for the slo indicator type', async () => {
        // @ts-ignore defining only a subset of the possible SLI
        const generators: Record<IndicatorTypes, TransformGenerator> = {
          'slo.apm.transaction_duration': new DummyTransformGenerator(),
        };
        const service = new DefaultTransformManager(generators, esClientMock, loggerMock);

        await expect(
          service.install(createSLO({ indicator: createAPMTransactionErrorRateIndicator() }))
        ).rejects.toThrowError('Unsupported SLO type: slo.apm.transaction_error_rate');
      });

      it('throws when transform generator fails', async () => {
        // @ts-ignore defining only a subset of the possible SLI
        const generators: Record<IndicatorTypes, TransformGenerator> = {
          'slo.apm.transaction_duration': new FailTransformGenerator(),
        };
        const transformManager = new DefaultTransformManager(generators, esClientMock, loggerMock);

        await expect(
          transformManager.install(
            createSLO({ indicator: createAPMTransactionDurationIndicator() })
          )
        ).rejects.toThrowError('Some error');
      });
    });

    it('installs the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(generators, esClientMock, loggerMock);
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      const transformId = await transformManager.install(slo);

      expect(esClientMock.transform.putTransform).toHaveBeenCalledTimes(1);
      expect(transformId).toBe(`slo-${slo.id}-${slo.revision}`);
    });
  });

  describe('Start', () => {
    it('starts the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(generators, esClientMock, loggerMock);

      await transformManager.start('slo-transform-id');

      expect(esClientMock.transform.startTransform).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stop', () => {
    it('stops the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(generators, esClientMock, loggerMock);

      await transformManager.stop('slo-transform-id');

      expect(esClientMock.transform.stopTransform).toHaveBeenCalledTimes(1);
    });
  });

  describe('Uninstall', () => {
    it('uninstalls the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(generators, esClientMock, loggerMock);

      await transformManager.uninstall('slo-transform-id');

      expect(esClientMock.transform.deleteTransform).toHaveBeenCalledTimes(1);
    });

    it('retries on transient error', async () => {
      esClientMock.transform.deleteTransform.mockRejectedValueOnce(
        new EsErrors.ConnectionError('irrelevant')
      );
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(generators, esClientMock, loggerMock);

      await transformManager.uninstall('slo-transform-id');

      expect(esClientMock.transform.deleteTransform).toHaveBeenCalledTimes(2);
    });
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
