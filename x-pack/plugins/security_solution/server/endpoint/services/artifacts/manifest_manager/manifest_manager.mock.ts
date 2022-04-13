/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import LRU from 'lru-cache';
import { savedObjectsClientMock, loggingSystemMock } from 'src/core/server/mocks';
import { Logger } from 'src/core/server';
import { PackagePolicyServiceInterface } from '../../../../../../fleet/server';
import { createPackagePolicyServiceMock } from '../../../../../../fleet/server/mocks';
import { ExceptionListClient } from '../../../../../../lists/server';
import { listMock } from '../../../../../../lists/server/mocks';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  createPackagePolicyWithManifestMock,
  createPackagePolicyWithInitialManifestMock,
  getMockManifest,
  getMockArtifactsWithDiff,
  getEmptyMockArtifacts,
} from '../../../lib/artifacts/mocks';
import { createEndpointArtifactClientMock, getManifestClientMock } from '../mocks';
import { ManifestManager, ManifestManagerContext } from './manifest_manager';
import { parseExperimentalConfigValue } from '../../../../../common/experimental_features';

export const createExceptionListResponse = (data: ExceptionListItemSchema[], total?: number) => ({
  data,
  page: 1,
  per_page: 100,
  total: total || data.length,
});

type FindExceptionListItemOptions = Parameters<ExceptionListClient['findExceptionListItem']>[0];

const FILTER_PROPERTY_PREFIX = 'exception-list-agnostic\\.attributes';
const FILTER_REGEXP = new RegExp(
  `^${FILTER_PROPERTY_PREFIX}\.os_types:"([^"]+)"( and \\(${FILTER_PROPERTY_PREFIX}\.tags:"policy:all"( or ${FILTER_PROPERTY_PREFIX}\.tags:"policy:([^"]+)")?\\))?$`
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
  cache: LRU<string, Buffer>;
  exceptionListClient: ExceptionListClient;
  packagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;
  savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
}

export const buildManifestManagerMockOptions = (
  opts: Partial<ManifestManagerMockOptions>
): ManifestManagerMockOptions => {
  const savedObjectMock = savedObjectsClientMock.create();
  return {
    cache: new LRU<string, Buffer>({ max: 10, maxAge: 1000 * 60 * 60 }),
    exceptionListClient: listMock.getExceptionListClient(savedObjectMock),
    packagePolicyService: createPackagePolicyServiceMock(),
    savedObjectsClient: savedObjectMock,
    ...opts,
  };
};

export const buildManifestManagerContextMock = (
  opts: Partial<ManifestManagerMockOptions>
): ManifestManagerContext => {
  const fullOpts = buildManifestManagerMockOptions(opts);

  return {
    ...fullOpts,
    artifactClient: createEndpointArtifactClientMock(),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
    experimentalFeatures: parseExperimentalConfigValue([]),
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
          return super.buildExceptionListArtifacts();
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
