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
import { ExceptionListItemSchema } from '../../../../../../lists/common/schemas/response';
import {
  createPackagePolicyWithManifestMock,
  createPackagePolicyWithInitialManifestMock,
  getMockManifest,
  getMockArtifactsWithDiff,
  getEmptyMockArtifacts,
} from '../../../lib/artifacts/mocks';
import { ArtifactClient } from '../artifact_client';
import { getManifestClientMock } from '../manifest_client.mock';
import { ManifestManager, ManifestManagerContext } from './manifest_manager';

export const createExceptionListResponse = (data: ExceptionListItemSchema[], total?: number) => ({
  data,
  page: 1,
  per_page: 100,
  total: total || data.length,
});

type FindExceptionListItemOptions = Parameters<ExceptionListClient['findExceptionListItem']>[0];

const FILTER_REGEXP = /^exception-list-agnostic\.attributes\.os_types:"(\w+)"$/;

export const mockFindExceptionListItemResponses = (
  responses: Record<string, Record<string, ExceptionListItemSchema[]>>
) => {
  return jest.fn().mockImplementation((options: FindExceptionListItemOptions) => {
    const os = FILTER_REGEXP.test(options.filter || '')
      ? options.filter!.match(FILTER_REGEXP)![1]
      : '';

    return createExceptionListResponse(responses[options.listId]?.[os] || []);
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
): ManifestManagerMockOptions => ({
  cache: new LRU<string, Buffer>({ max: 10, maxAge: 1000 * 60 * 60 }),
  exceptionListClient: listMock.getExceptionListClient(),
  packagePolicyService: createPackagePolicyServiceMock(),
  savedObjectsClient: savedObjectsClientMock.create(),
  ...opts,
});

export const buildManifestManagerContextMock = (
  opts: Partial<ManifestManagerMockOptions>
): ManifestManagerContext => {
  const fullOpts = buildManifestManagerMockOptions(opts);

  return {
    ...fullOpts,
    artifactClient: new ArtifactClient(fullOpts.savedObjectsClient),
    logger: loggingSystemMock.create().get() as jest.Mocked<Logger>,
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
          return super.buildExceptionListArtifacts('v1');
        case ManifestManagerMockType.NormalFlow:
          return getMockArtifactsWithDiff();
      }
    });

    public getLastComputedManifest = jest.fn().mockImplementation(() => {
      switch (mockType) {
        case ManifestManagerMockType.InitialSystemState:
          return null;
        case ManifestManagerMockType.NormalFlow:
          return getMockManifest({ compress: true });
      }
    });

    protected getManifestClient = jest
      .fn()
      .mockReturnValue(getManifestClientMock(this.savedObjectsClient));
  }

  return new ManifestManagerMock(context);
};
