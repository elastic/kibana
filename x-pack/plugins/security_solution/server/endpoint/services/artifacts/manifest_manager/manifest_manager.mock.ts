/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { ProductFeatureKeys } from '@kbn/security-solution-features';
import {
  createPackagePolicyWithInitialManifestMock,
  createPackagePolicyWithManifestMock,
  getEmptyMockArtifacts,
  getMockArtifactsWithDiff,
  getMockManifest,
} from '../../../lib/artifacts/mocks';
import { createEndpointArtifactClientMock, getManifestClientMock } from '../mocks';
import type { ManifestManagerContext } from './manifest_manager';
import { ManifestManager } from './manifest_manager';
import { parseExperimentalConfigValue } from '../../../../../common/experimental_features';
import { createProductFeaturesServiceMock } from '../../../../lib/product_features_service/mocks';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';

export const createExceptionListResponse = (data: ExceptionListItemSchema[], total?: number) => ({
  data,
  page: 1,
  per_page: 100,
  total: total || data.length,
});

type FindExceptionListItemOptions = Parameters<ExceptionListClient['findExceptionListItem']>[0];

const FILTER_PROPERTY_PREFIX = 'exception-list-agnostic\\.attributes';
const FILTER_REGEXP = new RegExp(
  `^${FILTER_PROPERTY_PREFIX}\\.os_types:"([^"]+)"( and \\(${FILTER_PROPERTY_PREFIX}\\.tags:"policy:all"( or ${FILTER_PROPERTY_PREFIX}\\.tags:"policy:([^"]+)")?\\))?$`
);

export const mockFindExceptionListItemResponses = (
  responses: Record<string, Record<string, ExceptionListItemSchema[]>>
) => {
  return jest.fn().mockImplementation((options: FindExceptionListItemOptions) => {
    const matches = options.filter?.match(FILTER_REGEXP) || [];

    if (matches[4] && responses[options.listId]?.[`${matches?.[1]}-${matches[4]}`]) {
      return createExceptionListResponse(
        responses[options.listId]?.[`${matches?.[1]}-${matches[4]}`] || []
      );
    } else {
      return createExceptionListResponse(responses[options.listId]?.[matches?.[1] || ''] || []);
    }
  });
};

export enum ManifestManagerMockType {
  InitialSystemState,
  ListClientPromiseRejection,
  NormalFlow,
}

export interface ManifestManagerMockOptions {
  exceptionListClient: ExceptionListClient;
  packagePolicyService: jest.Mocked<PackagePolicyClient>;
  savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  productFeaturesService: ProductFeaturesService;
}

export const buildManifestManagerMockOptions = (
  opts: Partial<ManifestManagerMockOptions>,
  customProductFeatures?: ProductFeatureKeys
): ManifestManagerMockOptions => {
  const savedObjectMock = savedObjectsClientMock.create();
  return {
    exceptionListClient: listMock.getExceptionListClient(savedObjectMock),
    packagePolicyService: createPackagePolicyServiceMock(),
    savedObjectsClient: savedObjectMock,
    productFeaturesService: createProductFeaturesServiceMock(customProductFeatures),
    ...opts,
  };
};

export const buildManifestManagerContextMock = (
  opts: Partial<ManifestManagerMockOptions>,
  customProductFeatures?: ProductFeatureKeys
): ManifestManagerContext => {
  const fullOpts = buildManifestManagerMockOptions(opts, customProductFeatures);

  return {
    ...fullOpts,
    artifactClient: createEndpointArtifactClientMock(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
    experimentalFeatures: parseExperimentalConfigValue([]).features,
    packagerTaskPackagePolicyUpdateBatchSize: 10,
    esClient: elasticsearchServiceMock.createElasticsearchClient(),
  };
};

export const buildManifestManagerMock = (opts?: Partial<ManifestManagerMockOptions>) => {
  const manifestManager = new ManifestManager(buildManifestManagerContextMock(opts || {}));
  manifestManager.getLastComputedManifest = jest.fn();
  manifestManager.buildNewManifest = jest.fn();
  manifestManager.pushArtifacts = jest.fn();
  manifestManager.deleteArtifacts = jest.fn();
  manifestManager.commit = jest.fn();
  manifestManager.tryDispatch = jest.fn();

  return manifestManager;
};

export const getManifestManagerMock = (
  opts?: Partial<ManifestManagerMockOptions> & { mockType?: ManifestManagerMockType }
): ManifestManager => {
  const { mockType = ManifestManagerMockType.NormalFlow, ...restOptions } = opts || {};
  const context = buildManifestManagerContextMock(restOptions);

  context.packagePolicyService.list = jest.fn().mockResolvedValue({
    total: 1,
    items: [
      { version: 'policy-1-version', ...createPackagePolicyWithManifestMock() },
      { version: 'policy-2-version', ...createPackagePolicyWithInitialManifestMock() },
      { version: 'policy-3-version', ...createPackagePolicyWithInitialManifestMock() },
    ],
  });

  class ManifestManagerMock extends ManifestManager {
    protected buildExceptionListArtifacts = jest.fn().mockImplementation(() => {
      switch (mockType) {
        case ManifestManagerMockType.InitialSystemState:
          return getEmptyMockArtifacts();
        case ManifestManagerMockType.ListClientPromiseRejection:
          context.exceptionListClient.findExceptionListItem = jest
            .fn()
            .mockRejectedValue(new Error('unexpected thing happened'));
          return super.buildExceptionListArtifacts([]);
        case ManifestManagerMockType.NormalFlow:
          return getMockArtifactsWithDiff();
      }
    });

    public getLastComputedManifest = jest.fn().mockImplementation(() => {
      switch (mockType) {
        case ManifestManagerMockType.InitialSystemState:
          return null;
        case ManifestManagerMockType.NormalFlow:
          return getMockManifest();
      }
    });

    protected getManifestClient = jest
      .fn()
      .mockReturnValue(getManifestClientMock(this.savedObjectsClient));
  }

  return new ManifestManagerMock(context);
};
