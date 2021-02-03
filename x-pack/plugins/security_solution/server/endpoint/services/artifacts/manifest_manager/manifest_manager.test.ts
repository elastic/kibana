/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inflateSync } from 'zlib';
import { SavedObjectsErrorHelpers } from 'src/core/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';
import { ENDPOINT_LIST_ID } from '../../../../../../lists/common';
import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../../../lists/common/constants';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { PackagePolicy } from '../../../../../../fleet/common/types/models';
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
  const ARTIFACT_ID_0 =
    'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_1 =
    'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_2 =
    'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_3 =
    'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';

  let ARTIFACTS: InternalArtifactCompleteSchema[] = [];
  let ARTIFACTS_MAP: { [K: string]: InternalArtifactCompleteSchema } = {};

  beforeAll(async () => {
    ARTIFACTS = await getMockArtifacts({ compress: true });
    ARTIFACTS_MAP = {
      [ARTIFACT_ID_0]: ARTIFACTS[0],
      [ARTIFACT_ID_1]: ARTIFACTS[1],
      [ARTIFACT_ID_2]: ARTIFACTS[2],
      [ARTIFACT_ID_3]: ARTIFACTS[3],
    };
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
                  { artifactId: ARTIFACT_ID_0, policyId: undefined },
                  { artifactId: ARTIFACT_ID_1, policyId: undefined },
                  { artifactId: ARTIFACT_ID_1, policyId: TEST_POLICY_ID_1 },
                  { artifactId: ARTIFACT_ID_2, policyId: TEST_POLICY_ID_1 },
                  { artifactId: ARTIFACT_ID_3, policyId: TEST_POLICY_ID_1 },
                  { artifactId: ARTIFACT_ID_3, policyId: TEST_POLICY_ID_2 },
                ],
              },
              version: '2.0.0',
            };
          } else if (objectType === ArtifactConstants.SAVED_OBJECT_TYPE) {
            return { attributes: ARTIFACTS_MAP[id], version: '2.1.1' };
          } else {
            return null;
          }
        });

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toStrictEqual('2.0.0');
      expect(manifest?.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 4));
      expect(manifest?.isDefaultArtifact(ARTIFACTS[0])).toBe(true);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACTS[0])).toStrictEqual(new Set());
      expect(manifest?.isDefaultArtifact(ARTIFACTS[1])).toBe(true);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACTS[1])).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
      expect(manifest?.isDefaultArtifact(ARTIFACTS[2])).toBe(false);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACTS[2])).toStrictEqual(
        new Set([TEST_POLICY_ID_1])
      );
      expect(manifest?.isDefaultArtifact(ARTIFACTS[3])).toBe(false);
      expect(manifest?.getArtifactTargetPolicies(ARTIFACTS[3])).toStrictEqual(
        new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
      );
    });
  });

  describe('buildNewManifest', () => {
    const SUPPORTED_ARTIFACT_IDS = [
      'endpoint-exceptionlist-macos-v1',
      'endpoint-exceptionlist-windows-v1',
      'endpoint-trustlist-macos-v1',
      'endpoint-trustlist-windows-v1',
      'endpoint-trustlist-linux-v1',
    ];

    const getArtifactIds = (artifacts: InternalArtifactSchema[]) =>
      artifacts.map((artifact) => artifact.identifier);

    test('Fails when exception list list client fails', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = jest.fn().mockRejectedValue(new Error());

      await expect(manifestManager.buildNewManifest()).rejects.toThrow();
    });

    test('Builds fully new manifest if no baseline parameter passed and no exception list items', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({});

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_IDS);
      expect(artifacts.every(isCompressed)).toBe(true);

      for (const artifact of artifacts) {
        expect(await uncompressArtifact(artifact)).toStrictEqual({ entries: [] });
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

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_IDS);
      expect(artifacts.every(isCompressed)).toBe(true);

      for (const artifact of artifacts) {
        if (artifact.identifier === 'endpoint-exceptionlist-macos-v1') {
          expect(await uncompressArtifact(artifact)).toStrictEqual({
            entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
          });
        } else if (artifact.identifier === 'endpoint-trustlist-linux-v1') {
          expect(await uncompressArtifact(artifact)).toStrictEqual({
            entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
          });
        } else {
          expect(await uncompressArtifact(artifact)).toStrictEqual({ entries: [] });
        }
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

      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_IDS);
      expect(artifacts.every(isCompressed)).toBe(true);

      for (const artifact of artifacts) {
        if (artifact.identifier === 'endpoint-exceptionlist-macos-v1') {
          expect(artifact).toStrictEqual(oldManifest.getAllArtifacts()[0]);
        } else if (artifact.identifier === 'endpoint-trustlist-linux-v1') {
          expect(await uncompressArtifact(artifact)).toStrictEqual({
            entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
          });
        } else {
          expect(await uncompressArtifact(artifact)).toStrictEqual({ entries: [] });
        }
      }
    });
  });

  describe('deleteArtifacts', () => {
    test('Successfully invokes saved objects client', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.savedObjectsClient.delete = jest.fn().mockResolvedValue({});

      await expect(
        manifestManager.deleteArtifacts([ARTIFACT_ID_0, ARTIFACT_ID_1])
      ).resolves.toStrictEqual([]);

      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_0
      );
      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        2,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_1
      );
    });

    test('Returns errors for partial failures', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const error = new Error();

      context.savedObjectsClient.delete = jest
        .fn()
        .mockImplementation(async (type: string, id: string) => {
          if (id === ARTIFACT_ID_1) {
            throw error;
          } else {
            return {};
          }
        });

      await expect(
        manifestManager.deleteArtifacts([ARTIFACT_ID_0, ARTIFACT_ID_1])
      ).resolves.toStrictEqual([error]);

      expect(context.savedObjectsClient.delete).toHaveBeenCalledTimes(2);
      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_0
      );
      expect(context.savedObjectsClient.delete).toHaveBeenNthCalledWith(
        2,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        ARTIFACT_ID_1
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
        manifestManager.pushArtifacts([ARTIFACTS[0], ARTIFACTS[1]])
      ).resolves.toStrictEqual([]);

      expect(context.savedObjectsClient.create).toHaveBeenCalledTimes(2);
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACTS[0], created: expect.anything() },
        { id: ARTIFACT_ID_0 }
      );
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        2,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACTS[1], created: expect.anything() },
        { id: ARTIFACT_ID_1 }
      );
      expect(await uncompressData(context.cache.get(getArtifactId(ARTIFACTS[0]))!)).toStrictEqual(
        await uncompressArtifact(ARTIFACTS[0])
      );
      expect(await uncompressData(context.cache.get(getArtifactId(ARTIFACTS[1]))!)).toStrictEqual(
        await uncompressArtifact(ARTIFACTS[1])
      );
    });

    test('Returns errors for partial failures', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const error = new Error();
      const { body, ...incompleteArtifact } = ARTIFACTS[2];

      context.savedObjectsClient.create = jest
        .fn()
        .mockImplementation(async (type: string, artifact: InternalArtifactCompleteSchema) => {
          if (getArtifactId(artifact) === ARTIFACT_ID_1) {
            throw error;
          } else {
            return artifact;
          }
        });

      await expect(
        manifestManager.pushArtifacts([
          ARTIFACTS[0],
          ARTIFACTS[1],
          incompleteArtifact as InternalArtifactCompleteSchema,
        ])
      ).resolves.toStrictEqual([error, new Error(`Incomplete artifact: ${ARTIFACT_ID_2}`)]);

      expect(context.savedObjectsClient.create).toHaveBeenCalledTimes(2);
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACTS[0], created: expect.anything() },
        { id: ARTIFACT_ID_0 }
      );
      expect(await uncompressData(context.cache.get(getArtifactId(ARTIFACTS[0]))!)).toStrictEqual(
        await uncompressArtifact(ARTIFACTS[0])
      );
      expect(context.cache.get(getArtifactId(ARTIFACTS[1]))).toBeUndefined();
    });

    test('Tolerates saved objects client conflict', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      context.savedObjectsClient.create = jest
        .fn()
        .mockRejectedValue(
          SavedObjectsErrorHelpers.createConflictError(
            ArtifactConstants.SAVED_OBJECT_TYPE,
            ARTIFACT_ID_0
          )
        );

      await expect(manifestManager.pushArtifacts([ARTIFACTS[0]])).resolves.toStrictEqual([]);

      expect(context.savedObjectsClient.create).toHaveBeenCalledTimes(1);
      expect(context.savedObjectsClient.create).toHaveBeenNthCalledWith(
        1,
        ArtifactConstants.SAVED_OBJECT_TYPE,
        { ...ARTIFACTS[0], created: expect.anything() },
        { id: ARTIFACT_ID_0 }
      );
      expect(context.cache.get(getArtifactId(ARTIFACTS[0]))).toBeUndefined();
    });
  });

  describe('commit', () => {
    test('Creates new saved object if no saved object version', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const manifest = Manifest.getDefault();

      manifest.addEntry(ARTIFACTS[0]);
      manifest.addEntry(ARTIFACTS[0], TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACTS[1], TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACTS[2], TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACTS[2], TEST_POLICY_ID_2);

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
            { artifactId: ARTIFACT_ID_0, policyId: undefined },
            { artifactId: ARTIFACT_ID_0, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_2, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_1, policyId: TEST_POLICY_ID_2 },
            { artifactId: ARTIFACT_ID_2, policyId: TEST_POLICY_ID_2 },
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

      manifest.addEntry(ARTIFACTS[0]);
      manifest.addEntry(ARTIFACTS[0], TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACTS[1], TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACTS[2], TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACTS[2], TEST_POLICY_ID_2);

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
            { artifactId: ARTIFACT_ID_0, policyId: undefined },
            { artifactId: ARTIFACT_ID_0, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_2, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_1, policyId: TEST_POLICY_ID_2 },
            { artifactId: ARTIFACT_ID_2, policyId: TEST_POLICY_ID_2 },
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

      manifest.addEntry(ARTIFACTS[0]);

      context.packagePolicyService.list = mockPolicyListResponse([]);

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.update).toHaveBeenCalledTimes(0);
    });

    test('Should return errors if invalid config for package policy', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0' });
      manifest.addEntry(ARTIFACTS[0]);

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
      manifest.addEntry(ARTIFACTS[0]);

      context.packagePolicyService.list = mockPolicyListResponse([
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_1,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  'endpoint-exceptionlist-windows-v1': ARTIFACTS[0],
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

    test('Should dispatch to only policies that were changed', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACTS[0]);
      manifest.addEntry(ARTIFACTS[1], TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACTS[1], TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACTS[2], TEST_POLICY_ID_2);

      context.packagePolicyService.list = mockPolicyListResponse([
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_1,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  'endpoint-exceptionlist-macos-v1': ARTIFACTS[0],
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
                  'endpoint-exceptionlist-windows-v1': ARTIFACTS[1],
                  'endpoint-trustlist-macos-v1': ARTIFACTS[2],
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
                    'endpoint-exceptionlist-windows-v1': ARTIFACTS[1],
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
      manifest.addEntry(ARTIFACTS[0]);

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
