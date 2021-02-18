/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inflateSync } from 'zlib';
import { SavedObjectsErrorHelpers } from 'src/core/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ENDPOINT_LIST_ID, ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../../lists/common';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { PackagePolicy } from '../../../../../../fleet/common/types/models';
import { getEmptyInternalArtifactMock } from '../../../schemas/artifacts/saved_objects.mock';
import {
  InternalArtifactCompleteSchema,
  InternalArtifactSchema,
  InternalManifestSchema,
} from '../../../schemas/artifacts';
import {
  createPackagePolicyWithConfigMock,
  getMockArtifacts,
  toArtifactRecords,
} from '../../../lib/artifacts/mocks';
import {
  ArtifactConstants,
  ManifestConstants,
  getArtifactId,
  isCompressed,
  translateToEndpointExceptions,
  Manifest,
} from '../../../lib/artifacts';

import {
  buildManifestManagerContextMock,
  mockFindExceptionListItemResponses,
} from './manifest_manager.mock';

import { ManifestManager } from './manifest_manager';

const uncompressData = async (data: Buffer) => JSON.parse(await inflateSync(data).toString());

const uncompressArtifact = async (artifact: InternalArtifactSchema) =>
  uncompressData(Buffer.from(artifact.body!, 'base64'));

describe('ManifestManager', () => {
  const TEST_POLICY_ID_1 = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
  const TEST_POLICY_ID_2 = '93c46720-c217-11ea-9906-b5b8a21b268e';
  const ARTIFACT_ID_EXCEPTIONS_MACOS =
    'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_EXCEPTIONS_WINDOWS =
    'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_TRUSTED_APPS_MACOS =
    'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_TRUSTED_APPS_WINDOWS =
    'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';

  const ARTIFACT_NAME_EXCEPTIONS_MACOS = 'endpoint-exceptionlist-macos-v1';
  const ARTIFACT_NAME_EXCEPTIONS_WINDOWS = 'endpoint-exceptionlist-windows-v1';
  const ARTIFACT_NAME_TRUSTED_APPS_MACOS = 'endpoint-trustlist-macos-v1';
  const ARTIFACT_NAME_TRUSTED_APPS_WINDOWS = 'endpoint-trustlist-windows-v1';
  const ARTIFACT_NAME_TRUSTED_APPS_LINUX = 'endpoint-trustlist-linux-v1';

  let ARTIFACTS: InternalArtifactCompleteSchema[] = [];
  let ARTIFACTS_BY_ID: { [K: string]: InternalArtifactCompleteSchema } = {};
  let ARTIFACT_EXCEPTIONS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_EXCEPTIONS_WINDOWS: InternalArtifactCompleteSchema;
  let ARTIFACT_TRUSTED_APPS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_TRUSTED_APPS_WINDOWS: InternalArtifactCompleteSchema;

  beforeAll(async () => {
    ARTIFACTS = await getMockArtifacts({ compress: true });
    ARTIFACTS_BY_ID = {
      [ARTIFACT_ID_EXCEPTIONS_MACOS]: ARTIFACTS[0],
      [ARTIFACT_ID_EXCEPTIONS_WINDOWS]: ARTIFACTS[1],
      [ARTIFACT_ID_TRUSTED_APPS_MACOS]: ARTIFACTS[2],
      [ARTIFACT_ID_TRUSTED_APPS_WINDOWS]: ARTIFACTS[3],
    };
    ARTIFACT_EXCEPTIONS_MACOS = ARTIFACTS[0];
    ARTIFACT_EXCEPTIONS_WINDOWS = ARTIFACTS[1];
    ARTIFACT_TRUSTED_APPS_MACOS = ARTIFACTS[2];
    ARTIFACT_TRUSTED_APPS_WINDOWS = ARTIFACTS[3];
  });

  describe('getLastComputedManifest', () => {
    test('Returns null when saved object not found', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({ savedObjectsClient })
      );

      savedObjectsClient.get = jest.fn().mockRejectedValue({ output: { statusCode: 404 } });

      expect(await manifestManager.getLastComputedManifest()).toBe(null);
    });

    test('Throws error when saved object client responds with 500', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({ savedObjectsClient })
      );
      const error = { output: { statusCode: 500 } };

      savedObjectsClient.get = jest.fn().mockRejectedValue(error);

      await expect(manifestManager.getLastComputedManifest()).rejects.toStrictEqual(error);
    });

    test('Throws error when no version on the manifest', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({ savedObjectsClient })
      );

      savedObjectsClient.get = jest.fn().mockResolvedValue({});

      await expect(manifestManager.getLastComputedManifest()).rejects.toStrictEqual(
        new Error('No version returned for manifest.')
      );
    });

    test('Retrieves empty manifest successfully', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({ savedObjectsClient })
      );

      savedObjectsClient.get = jest.fn().mockResolvedValue({
        attributes: {
          created: '20-01-2020 10:00:00.000Z',
          schemaVersion: 'v2',
          semanticVersion: '1.0.0',
          artifacts: [],
        },
        version: '2.0.0',
      });

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toStrictEqual('2.0.0');
      expect(manifest?.getAllArtifacts()).toStrictEqual([]);
    });

    test('Retrieves non empty manifest successfully', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({ savedObjectsClient })
      );

      savedObjectsClient.get = jest
        .fn()
        .mockImplementation(async (objectType: string, id: string) => {
          if (objectType === ManifestConstants.SAVED_OBJECT_TYPE) {
            return {
              attributes: {
                created: '20-01-2020 10:00:00.000Z',
                schemaVersion: 'v2',
                semanticVersion: '1.0.0',
                artifacts: [
                  { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
                  { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: undefined },
                  { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: TEST_POLICY_ID_1 },
                  { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_1 },
                  { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_1 },
                  { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_2 },
                ],
              },
              version: '2.0.0',
            };
          } else if (objectType === ArtifactConstants.SAVED_OBJECT_TYPE) {
            return { attributes: ARTIFACTS_BY_ID[id], version: '2.1.1' };
          } else {
            return null;
          }
        });

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toStrictEqual('2.0.0');
      expect(manifest?.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 4));
      expect(manifest?.isDefaultArtifact(ARTIFACT_EXCEPTIONS_MACOS)).toBe(true);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_MACOS)).toStrictEqual(
        new Set()
      );
      expect(manifest?.isDefaultArtifact(ARTIFACT_EXCEPTIONS_WINDOWS)).toBe(true);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACT_EXCEPTIONS_WINDOWS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
      expect(manifest?.isDefaultArtifact(ARTIFACT_TRUSTED_APPS_MACOS)).toBe(false);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACT_TRUSTED_APPS_MACOS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
      expect(manifest?.isDefaultArtifact(ARTIFACT_TRUSTED_APPS_WINDOWS)).toBe(false);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACT_TRUSTED_APPS_WINDOWS)).toStrictEqual(
        new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
      );
    });
  });

  describe('buildNewManifest', () => {
    const SUPPORTED_ARTIFACT_NAMES = [
      ARTIFACT_NAME_EXCEPTIONS_MACOS,
      ARTIFACT_NAME_EXCEPTIONS_WINDOWS,
      ARTIFACT_NAME_TRUSTED_APPS_MACOS,
      ARTIFACT_NAME_TRUSTED_APPS_WINDOWS,
      ARTIFACT_NAME_TRUSTED_APPS_LINUX,
    ];

    const getArtifactIds = (artifacts: InternalArtifactSchema[]) => [
      ...new Set(artifacts.map((artifact) => artifact.identifier)).values(),
    ];

    const mockPolicyListIdsResponse = (items: string[]) =>
      jest.fn().mockResolvedValue({
        items,
        page: 1,
        per_page: 100,
        total: items.length,
      });

    test('Fails when exception list client fails', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = jest.fn().mockRejectedValue(new Error());

      await expect(manifestManager.buildNewManifest()).rejects.toThrow();
    });

    test('Builds fully new manifest if no baseline parameter passed and no exception list items', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({});
      context.packagePolicyService.listIds = mockPolicyListIdsResponse([TEST_POLICY_ID_1]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(5);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);
      expect(artifacts.every(isCompressed)).toBe(true);

      for (const artifact of artifacts) {
        expect(await uncompressArtifact(artifact)).toStrictEqual({ entries: [] });
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test('Builds fully new manifest if no baseline parameter passed and present exception list items', async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_TRUSTED_APPS_LIST_ID]: { linux: [trustedAppListItem] },
      });
      context.packagePolicyService.listIds = mockPolicyListIdsResponse([TEST_POLICY_ID_1]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(5);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);
      expect(artifacts.every(isCompressed)).toBe(true);

      expect(await uncompressArtifact(artifacts[0])).toStrictEqual({
        entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
      });
      expect(await uncompressArtifact(artifacts[1])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[2])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[3])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[4])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });

      for (const artifact of artifacts) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test('Reuses artifacts when baseline parameter passed and present exception list items', async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
      });
      context.packagePolicyService.listIds = mockPolicyListIdsResponse([TEST_POLICY_ID_1]);

      const oldManifest = await manifestManager.buildNewManifest();

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_TRUSTED_APPS_LIST_ID]: { linux: [trustedAppListItem] },
      });

      const manifest = await manifestManager.buildNewManifest(oldManifest);

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(5);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);
      expect(artifacts.every(isCompressed)).toBe(true);

      expect(artifacts[0]).toStrictEqual(oldManifest.getAllArtifacts()[0]);
      expect(await uncompressArtifact(artifacts[1])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[2])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[3])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[4])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });

      for (const artifact of artifacts) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test('Builds manifest with policy specific exception list items for trusted apps', async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      const trustedAppListItemPolicy2 = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        entries: [
          { field: 'other.field', operator: 'included', type: 'match', value: 'other value' },
        ],
      });
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_TRUSTED_APPS_LIST_ID]: {
          linux: [trustedAppListItem],
          [`linux-${TEST_POLICY_ID_2}`]: [trustedAppListItem, trustedAppListItemPolicy2],
        },
      });
      context.packagePolicyService.listIds = mockPolicyListIdsResponse([
        TEST_POLICY_ID_1,
        TEST_POLICY_ID_2,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(6);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);
      expect(artifacts.every(isCompressed)).toBe(true);

      expect(await uncompressArtifact(artifacts[0])).toStrictEqual({
        entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
      });
      expect(await uncompressArtifact(artifacts[1])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[2])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[3])).toStrictEqual({ entries: [] });
      expect(await uncompressArtifact(artifacts[4])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });
      expect(await uncompressArtifact(artifacts[5])).toStrictEqual({
        entries: translateToEndpointExceptions(
          [trustedAppListItem, trustedAppListItemPolicy2],
          'v1'
        ),
      });

      for (const artifact of artifacts.slice(0, 4)) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
        );
      }

      expect(manifest.isDefaultArtifact(artifacts[5])).toBe(false);
      expect(manifest.getArtifactTargetPolicies(artifacts[5])).toStrictEqual(
        new Set([TEST_POLICY_ID_2])
      );
    });
  });

  describe('deleteArtifacts', () => {
    test('Successfully invokes saved objects client', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.savedObjectsClient.delete = jest.fn().mockResolvedValue({});

      await expect(
        manifestManager.deleteArtifacts([
          ARTIFACT_ID_EXCEPTIONS_MACOS,
          ARTIFACT_ID_EXCEPTIONS_WINDOWS,
        ])
      ).resolves.toStrictEqual([]);

      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_EXCEPTIONS_MACOS
      );
      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        2,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_EXCEPTIONS_WINDOWS
      );
    });

    test('Returns errors for partial failures', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const error = new Error();

      context.savedObjectsClient.delete = jest
        .fn()
        .mockImplementation(async (type: string, id: string) => {
          if (id === ARTIFACT_ID_EXCEPTIONS_WINDOWS) {
            throw error;
          } else {
            return {};
          }
        });

      await expect(
        manifestManager.deleteArtifacts([
          ARTIFACT_ID_EXCEPTIONS_MACOS,
          ARTIFACT_ID_EXCEPTIONS_WINDOWS,
        ])
      ).resolves.toStrictEqual([error]);

      expect(context.savedObjectsClient.delete).toHaveBeenCalledTimes(2);
      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_EXCEPTIONS_MACOS
      );
      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        2,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_EXCEPTIONS_WINDOWS
      );
    });
  });

  describe('pushArtifacts', () => {
    test('Successfully invokes saved objects client and stores in the cache', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.savedObjectsClient.create = jest
        .fn()
        .mockImplementation((type: string, artifact: InternalArtifactCompleteSchema) => artifact);

      await expect(
        manifestManager.pushArtifacts([ARTIFACT_EXCEPTIONS_MACOS, ARTIFACT_EXCEPTIONS_WINDOWS])
      ).resolves.toStrictEqual([]);

      expect(context.savedObjectsClient.create).toHaveBeenCalledTimes(2);
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACT_EXCEPTIONS_MACOS, created: expect.anything() },
        { id: ARTIFACT_ID_EXCEPTIONS_MACOS }
      );
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        2,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACT_EXCEPTIONS_WINDOWS, created: expect.anything() },
        { id: ARTIFACT_ID_EXCEPTIONS_WINDOWS }
      );
      expect(
        await uncompressData(context.cache.get(getArtifactId(ARTIFACT_EXCEPTIONS_MACOS))!)
      ).toStrictEqual(await uncompressArtifact(ARTIFACT_EXCEPTIONS_MACOS));
      expect(
        await uncompressData(context.cache.get(getArtifactId(ARTIFACT_EXCEPTIONS_WINDOWS))!)
      ).toStrictEqual(await uncompressArtifact(ARTIFACT_EXCEPTIONS_WINDOWS));
    });

    test('Returns errors for partial failures', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const error = new Error();
      const { body, ...incompleteArtifact } = ARTIFACT_TRUSTED_APPS_MACOS;

      context.savedObjectsClient.create = jest
        .fn()
        .mockImplementation(async (type: string, artifact: InternalArtifactCompleteSchema) => {
          if (getArtifactId(artifact) === ARTIFACT_ID_EXCEPTIONS_WINDOWS) {
            throw error;
          } else {
            return artifact;
          }
        });

      await expect(
        manifestManager.pushArtifacts([
          ARTIFACT_EXCEPTIONS_MACOS,
          ARTIFACT_EXCEPTIONS_WINDOWS,
          incompleteArtifact as InternalArtifactCompleteSchema,
        ])
      ).resolves.toStrictEqual([
        error,
        new Error(`Incomplete artifact: ${ARTIFACT_ID_TRUSTED_APPS_MACOS}`),
      ]);

      expect(context.savedObjectsClient.create).toHaveBeenCalledTimes(2);
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACT_EXCEPTIONS_MACOS, created: expect.anything() },
        { id: ARTIFACT_ID_EXCEPTIONS_MACOS }
      );
      expect(
        await uncompressData(context.cache.get(getArtifactId(ARTIFACT_EXCEPTIONS_MACOS))!)
      ).toStrictEqual(await uncompressArtifact(ARTIFACT_EXCEPTIONS_MACOS));
      expect(context.cache.get(getArtifactId(ARTIFACT_EXCEPTIONS_WINDOWS))).toBeUndefined();
    });

    test('Tolerates saved objects client conflict', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.savedObjectsClient.create = jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createConflictError(
            ArtifactConstants.SAVED_OBJECT_TYPE,
            ARTIFACT_ID_EXCEPTIONS_MACOS
          )
        );

      await expect(
        manifestManager.pushArtifacts([ARTIFACT_EXCEPTIONS_MACOS])
      ).resolves.toStrictEqual([]);

      expect(context.savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACT_EXCEPTIONS_MACOS, created: expect.anything() },
        { id: ARTIFACT_ID_EXCEPTIONS_MACOS }
      );
      expect(context.cache.get(getArtifactId(ARTIFACT_EXCEPTIONS_MACOS))).toBeUndefined();
    });
  });

  describe('commit', () => {
    test('Creates new saved object if no saved object version', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const manifest = Manifest.getDefault();

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      context.savedObjectsClient.create = jest
        .fn()
        .mockImplementation((type: string, object: InternalManifestSchema) => object);

      await expect(manifestManager.commit(manifest)).resolves.toBeUndefined();

      expect(context.savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        1,
        ManifestConstants.SAVED_OBJECT_TYPE,
        {
          artifacts: [
            { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
            { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: TEST_POLICY_ID_2 },
            { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_2 },
          ],
          schemaVersion: 'v1',
          semanticVersion: '1.0.0',
          created: expect.anything(),
        },
        { id: 'endpoint-manifest-v1' }
      );
    });

    test('Updates existing saved object if has saved object version', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const manifest = new Manifest({ soVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      context.savedObjectsClient.update = jest
        .fn()
        .mockImplementation((type: string, id: string, object: InternalManifestSchema) => object);

      await expect(manifestManager.commit(manifest)).resolves.toBeUndefined();

      expect(context.savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(context.savedObjectsClient.update).toHaveBeenNthCalledWith(
        1,
        ManifestConstants.SAVED_OBJECT_TYPE,
        'endpoint-manifest-v1',
        {
          artifacts: [
            { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
            { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: TEST_POLICY_ID_2 },
            { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_2 },
          ],
          schemaVersion: 'v1',
          semanticVersion: '1.0.0',
        },
        { version: '1.0.0' }
      );
    });

    test('Throws error when saved objects client fails', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const manifest = new Manifest({ soVersion: '1.0.0' });
      const error = new Error();

      context.savedObjectsClient.update = jest.fn().mockRejectedValue(error);

      await expect(manifestManager.commit(manifest)).rejects.toBe(error);

      expect(context.savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(context.savedObjectsClient.update).toHaveBeenNthCalledWith(
        1,
        ManifestConstants.SAVED_OBJECT_TYPE,
        'endpoint-manifest-v1',
        {
          artifacts: [],
          schemaVersion: 'v1',
          semanticVersion: '1.0.0',
        },
        { version: '1.0.0' }
      );
    });
  });

  describe('tryDispatch', () => {
    const mockPolicyListResponse = (items: PackagePolicy[]) =>
      jest.fn().mockResolvedValue({
        items,
        page: 1,
        per_page: 100,
        total: items.length,
      });

    const toNewPackagePolicy = (packagePolicy: PackagePolicy) => {
      const { id, revision, updated_at: updatedAt, updated_by: updatedBy, ...rest } = packagePolicy;

      return rest;
    };

    test('Should not dispatch if no policies', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const manifest = new Manifest({ soVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      context.packagePolicyService.list = mockPolicyListResponse([]);

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.update).toHaveBeenCalledTimes(0);
    });

    test('Should return errors if invalid config for package policy', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      context.packagePolicyService.list = mockPolicyListResponse([
        createPackagePolicyWithConfigMock({ id: TEST_POLICY_ID_1 }),
      ]);

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([
        new Error(`Package Policy ${TEST_POLICY_ID_1} has no config.`),
      ]);

      expect(context.packagePolicyService.update).toHaveBeenCalledTimes(0);
    });

    test('Should not dispatch if semantic version has not changed', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      context.packagePolicyService.list = mockPolicyListResponse([
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_1,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  [ARTIFACT_NAME_EXCEPTIONS_WINDOWS]: ARTIFACT_EXCEPTIONS_MACOS,
                }),
                manifest_version: '1.0.0',
                schema_version: 'v1',
              },
            },
          },
        }),
      ]);

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.update).toHaveBeenCalledTimes(0);
    });

    test('Should dispatch to only policies where list of artifacts changed', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      context.packagePolicyService.list = mockPolicyListResponse([
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_1,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  [ARTIFACT_NAME_EXCEPTIONS_MACOS]: ARTIFACT_EXCEPTIONS_MACOS,
                }),
                manifest_version: '1.0.0',
                schema_version: 'v1',
              },
            },
          },
        }),
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_2,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  [ARTIFACT_NAME_EXCEPTIONS_WINDOWS]: ARTIFACT_EXCEPTIONS_WINDOWS,
                  [ARTIFACT_NAME_TRUSTED_APPS_MACOS]: ARTIFACT_TRUSTED_APPS_MACOS,
                }),
                manifest_version: '1.0.0',
                schema_version: 'v1',
              },
            },
          },
        }),
      ]);
      context.packagePolicyService.update = jest.fn().mockResolvedValue({});

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.update).toHaveBeenCalledTimes(1);
      expect(context.packagePolicyService.update).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        undefined,
        TEST_POLICY_ID_1,
        toNewPackagePolicy(
          createPackagePolicyWithConfigMock({
            id: TEST_POLICY_ID_1,
            config: {
              artifact_manifest: {
                value: {
                  artifacts: toArtifactRecords({
                    [ARTIFACT_NAME_EXCEPTIONS_WINDOWS]: ARTIFACT_EXCEPTIONS_WINDOWS,
                  }),
                  manifest_version: '1.0.1',
                  schema_version: 'v1',
                },
              },
            },
          })
        )
      );
    });

    test('Should dispatch to only policies where artifact content changed', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      context.packagePolicyService.list = mockPolicyListResponse([
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_1,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  [ARTIFACT_NAME_EXCEPTIONS_MACOS]: await getEmptyInternalArtifactMock(
                    'macos',
                    'v1',
                    {
                      compress: true,
                    }
                  ),
                }),
                manifest_version: '1.0.0',
                schema_version: 'v1',
              },
            },
          },
        }),
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_2,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  [ARTIFACT_NAME_EXCEPTIONS_WINDOWS]: ARTIFACT_EXCEPTIONS_WINDOWS,
                  [ARTIFACT_NAME_TRUSTED_APPS_MACOS]: ARTIFACT_TRUSTED_APPS_MACOS,
                }),
                manifest_version: '1.0.0',
                schema_version: 'v1',
              },
            },
          },
        }),
      ]);
      context.packagePolicyService.update = jest.fn().mockResolvedValue({});

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.update).toHaveBeenCalledTimes(1);
      expect(context.packagePolicyService.update).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        undefined,
        TEST_POLICY_ID_1,
        toNewPackagePolicy(
          createPackagePolicyWithConfigMock({
            id: TEST_POLICY_ID_1,
            config: {
              artifact_manifest: {
                value: {
                  artifacts: toArtifactRecords({
                    [ARTIFACT_NAME_EXCEPTIONS_MACOS]: ARTIFACT_EXCEPTIONS_MACOS,
                  }),
                  manifest_version: '1.0.1',
                  schema_version: 'v1',
                },
              },
            },
          })
        )
      );
    });

    test('Should return partial errors', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const error = new Error();

      const manifest = new Manifest({ soVersion: '1.0.0', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      context.packagePolicyService.list = mockPolicyListResponse([
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_1,
          config: {
            artifact_manifest: {
              value: {
                artifacts: {},
                manifest_version: '1.0.0',
                schema_version: 'v1',
              },
            },
          },
        }),
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_2,
          config: {
            artifact_manifest: {
              value: {
                artifacts: {},
                manifest_version: '1.0.0',
                schema_version: 'v1',
              },
            },
          },
        }),
      ]);
      context.packagePolicyService.update = jest.fn().mockImplementation(async (...args) => {
        if (args[2] === TEST_POLICY_ID_2) {
          throw error;
        } else {
          return {};
        }
      });

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([error]);

      expect(context.packagePolicyService.update).toHaveBeenCalledTimes(2);
    });
  });
});
