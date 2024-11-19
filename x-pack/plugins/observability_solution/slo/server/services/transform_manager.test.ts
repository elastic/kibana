/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import {
  ScopedClusterClientMock,
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
import { SLODefinition, IndicatorTypes } from '../domain/models';
import {
  createAPMTransactionDurationIndicator,
  createAPMTransactionErrorRateIndicator,
  createSLO,
} from './fixtures/slo';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { DataViewsService } from '@kbn/data-views-plugin/common';

describe('TransformManager', () => {
  let scopedClusterClientMock: ScopedClusterClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  const spaceId = 'default';

  beforeEach(() => {
    scopedClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  describe('Install', () => {
    describe('Unhappy path', () => {
      it('throws when no generator exists for the slo indicator type', async () => {
        // @ts-ignore defining only a subset of the possible SLI
        const generators: Record<IndicatorTypes, TransformGenerator> = {
          'sli.apm.transactionDuration': new DummyTransformGenerator(),
        };
        const service = new DefaultTransformManager(
          generators,
          scopedClusterClientMock,
          loggerMock,
          spaceId,
          dataViewsService
        );

        await expect(
          service.install(createSLO({ indicator: createAPMTransactionErrorRateIndicator() }))
        ).rejects.toThrowError('Unsupported indicator type [sli.apm.transactionErrorRate]');
      });

      it('throws when transform generator fails', async () => {
        // @ts-ignore defining only a subset of the possible SLI
        const generators: Record<IndicatorTypes, TransformGenerator> = {
          'sli.apm.transactionDuration': new FailTransformGenerator(),
        };
        const transformManager = new DefaultTransformManager(
          generators,
          scopedClusterClientMock,
          loggerMock,
          spaceId,
          dataViewsService
        );

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
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      const transformId = await transformManager.install(slo);

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.putTransform
      ).toHaveBeenCalledTimes(1);
      expect(transformId).toBe(`slo-${slo.id}-${slo.revision}`);
    });
  });

  describe('Preview', () => {
    it('previews the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.preview('slo-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.previewTransform
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Start', () => {
    it('starts the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.start('slo-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.startTransform
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stop', () => {
    it('stops the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.stop('slo-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.stopTransform
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('Uninstall', () => {
    it('uninstalls the transform', async () => {
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.uninstall('slo-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledTimes(1);
    });

    it('retries on transient error', async () => {
      scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform.mockRejectedValueOnce(
        new EsErrors.ConnectionError('irrelevant')
      );
      // @ts-ignore defining only a subset of the possible SLI
      const generators: Record<IndicatorTypes, TransformGenerator> = {
        'sli.apm.transactionErrorRate': new ApmTransactionErrorRateTransformGenerator(),
      };
      const transformManager = new DefaultTransformManager(
        generators,
        scopedClusterClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.uninstall('slo-transform-id');

      expect(
        scopedClusterClientMock.asSecondaryAuthUser.transform.deleteTransform
      ).toHaveBeenCalledTimes(2);
    });
  });
});

class DummyTransformGenerator extends TransformGenerator {
  async getTransformParams(
    slo: SLODefinition,
    spaceId: string,
    dataViewService: DataViewsService
  ): Promise<TransformPutTransformRequest> {
    return {} as TransformPutTransformRequest;
  }
}

class FailTransformGenerator extends TransformGenerator {
  getTransformParams(
    slo: SLODefinition,
    spaceId: string,
    dataViewService: DataViewsService
  ): Promise<TransformPutTransformRequest> {
    throw new Error('Some error');
  }
}
