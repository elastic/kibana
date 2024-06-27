/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';

import { DefaultTransformManager } from './transform_manager';
import {
  createAPMTransactionDurationIndicator,
  createAPMTransactionErrorRateIndicator,
  createSLO,
} from './fixtures/slo';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';

describe('TransformManager', () => {
  let esClientMock: ElasticsearchClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  const spaceId = 'default';

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    loggerMock = loggingSystemMock.createLogger();
  });

  describe('Install', () => {
    describe('Unhappy path', () => {
      it('throws when no generator exists for the slo indicator type', async () => {
        const service = new DefaultTransformManager(
          esClientMock,
          loggerMock,
          spaceId,
          dataViewsService
        );

        await expect(
          service.install(createSLO({ indicator: createAPMTransactionErrorRateIndicator() }))
        ).rejects.toThrowError('Unsupported indicator type [sli.apm.transactionErrorRate]');
      });

      it('throws when transform generator fails', async () => {
        const transformManager = new DefaultTransformManager(
          esClientMock,
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
      const transformManager = new DefaultTransformManager(
        esClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );
      const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

      const transformId = await transformManager.install(slo);

      expect(esClientMock.transform.putTransform).toHaveBeenCalledTimes(1);
      expect(transformId).toBe(`slo-${slo.id}-${slo.revision}`);
    });
  });

  describe('Preview', () => {
    it('previews the transform', async () => {
      const transformManager = new DefaultTransformManager(
        esClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.preview('slo-transform-id');

      expect(esClientMock.transform.previewTransform).toHaveBeenCalledTimes(1);
    });
  });

  describe('Start', () => {
    it('starts the transform', async () => {
      const transformManager = new DefaultTransformManager(
        esClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.start('slo-transform-id');

      expect(esClientMock.transform.startTransform).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stop', () => {
    it('stops the transform', async () => {
      const transformManager = new DefaultTransformManager(
        esClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.stop('slo-transform-id');

      expect(esClientMock.transform.stopTransform).toHaveBeenCalledTimes(1);
    });
  });

  describe('Uninstall', () => {
    it('uninstalls the transform', async () => {
      const transformManager = new DefaultTransformManager(
        esClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.uninstall('slo-transform-id');

      expect(esClientMock.transform.deleteTransform).toHaveBeenCalledTimes(1);
    });

    it('retries on transient error', async () => {
      esClientMock.transform.deleteTransform.mockRejectedValueOnce(
        new EsErrors.ConnectionError('irrelevant')
      );
      const transformManager = new DefaultTransformManager(
        esClientMock,
        loggerMock,
        spaceId,
        dataViewsService
      );

      await transformManager.uninstall('slo-transform-id');

      expect(esClientMock.transform.deleteTransform).toHaveBeenCalledTimes(2);
    });
  });
});
