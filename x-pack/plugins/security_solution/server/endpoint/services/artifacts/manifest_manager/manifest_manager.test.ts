/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { ENDPOINT_LIST_ID, ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types/models';
import { getEmptyInternalArtifactMock } from '../../../schemas/artifacts/saved_objects.mock';
import type {
  InternalArtifactCompleteSchema,
  InternalArtifactSchema,
  InternalManifestSchema,
  InternalUnifiedManifestSchema,
} from '../../../schemas/artifacts';
import {
  createPackagePolicyWithConfigMock,
  getMockArtifacts,
  toArtifactRecords,
} from '../../../lib/artifacts/mocks';
import {
  getArtifactId,
  Manifest,
  ManifestConstants,
  translateToEndpointExceptions,
} from '../../../lib/artifacts';

import {
  buildManifestManagerContextMock,
  mockFindExceptionListItemResponses,
} from './manifest_manager.mock';

import type { ManifestManagerContext } from './manifest_manager';
import { ManifestManager } from './manifest_manager';
import type { EndpointArtifactClientInterface } from '../artifact_client';
import { InvalidInternalManifestError } from '../errors';
import { EndpointError } from '../../../../../common/endpoint/errors';
import type { Artifact } from '@kbn/fleet-plugin/server';
import { ProductFeatureSecurityKey } from '@kbn/security-solution-features/keys';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types/src/response/exception_list_item_schema';
import {
  createFetchAllArtifactsIterableMock,
  generateArtifactMock,
} from '@kbn/fleet-plugin/server/services/artifacts/mocks';

const getArtifactObject = (artifact: InternalArtifactSchema) =>
  JSON.parse(Buffer.from(artifact.body!, 'base64').toString());

describe('ManifestManager', () => {
  const TEST_POLICY_ID_1 = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
  const TEST_POLICY_ID_2 = '93c46720-c217-11ea-9906-b5b8a21b268e';
  const ARTIFACT_ID_EXCEPTIONS_LINUX =
    'endpoint-exceptionlist-linux-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_EXCEPTIONS_MACOS =
    'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_EXCEPTIONS_WINDOWS =
    'endpoint-exceptionlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_TRUSTED_APPS_MACOS =
    'endpoint-trustlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';
  const ARTIFACT_ID_TRUSTED_APPS_WINDOWS =
    'endpoint-trustlist-windows-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3';

  const ARTIFACT_NAME_EXCEPTIONS_LINUX = 'endpoint-exceptionlist-linux-v1';
  const ARTIFACT_NAME_EXCEPTIONS_MACOS = 'endpoint-exceptionlist-macos-v1';
  const ARTIFACT_NAME_EXCEPTIONS_WINDOWS = 'endpoint-exceptionlist-windows-v1';
  const ARTIFACT_NAME_TRUSTED_APPS_MACOS = 'endpoint-trustlist-macos-v1';
  const ARTIFACT_NAME_TRUSTED_APPS_WINDOWS = 'endpoint-trustlist-windows-v1';
  const ARTIFACT_NAME_TRUSTED_APPS_LINUX = 'endpoint-trustlist-linux-v1';
  const ARTIFACT_NAME_EVENT_FILTERS_MACOS = 'endpoint-eventfilterlist-macos-v1';
  const ARTIFACT_NAME_EVENT_FILTERS_WINDOWS = 'endpoint-eventfilterlist-windows-v1';
  const ARTIFACT_NAME_EVENT_FILTERS_LINUX = 'endpoint-eventfilterlist-linux-v1';
  const ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_MACOS =
    'endpoint-hostisolationexceptionlist-macos-v1';
  const ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_WINDOWS =
    'endpoint-hostisolationexceptionlist-windows-v1';
  const ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_LINUX =
    'endpoint-hostisolationexceptionlist-linux-v1';
  const ARTIFACT_NAME_BLOCKLISTS_MACOS = 'endpoint-blocklist-macos-v1';
  const ARTIFACT_NAME_BLOCKLISTS_WINDOWS = 'endpoint-blocklist-windows-v1';
  const ARTIFACT_NAME_BLOCKLISTS_LINUX = 'endpoint-blocklist-linux-v1';

  const getMockPolicyFetchAllItemIds = (items: string[]) =>
    jest.fn(async function* () {
      yield items;
    });

  let ARTIFACTS: InternalArtifactCompleteSchema[] = [];
  let ARTIFACTS_BY_ID: { [K: string]: InternalArtifactCompleteSchema } = {};
  let ARTIFACT_EXCEPTIONS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_EXCEPTIONS_WINDOWS: InternalArtifactCompleteSchema;
  let ARTIFACT_TRUSTED_APPS_MACOS: InternalArtifactCompleteSchema;
  let ARTIFACT_TRUSTED_APPS_WINDOWS: InternalArtifactCompleteSchema;

  beforeAll(async () => {
    ARTIFACTS = await getMockArtifacts();
    ARTIFACTS_BY_ID = {
      [ARTIFACT_ID_EXCEPTIONS_MACOS]: ARTIFACTS[0],
      [ARTIFACT_ID_EXCEPTIONS_WINDOWS]: ARTIFACTS[1],
      [ARTIFACT_ID_EXCEPTIONS_LINUX]: ARTIFACTS[2],
      [ARTIFACT_ID_TRUSTED_APPS_MACOS]: ARTIFACTS[3],
      [ARTIFACT_ID_TRUSTED_APPS_WINDOWS]: ARTIFACTS[4],
    };
    ARTIFACT_EXCEPTIONS_MACOS = ARTIFACTS[0];
    ARTIFACT_EXCEPTIONS_WINDOWS = ARTIFACTS[1];
    ARTIFACT_TRUSTED_APPS_MACOS = ARTIFACTS[3];
    ARTIFACT_TRUSTED_APPS_WINDOWS = ARTIFACTS[4];
  });

  describe('getLastComputedManifest from Unified Manifest SO', () => {
    const mockGetAllUnifiedManifestsSOFromCache = jest.fn().mockImplementation(() => [
      {
        policyId: '.global',
        semanticVersion: '1.0.0',
        artifactIds: [
          ARTIFACT_ID_EXCEPTIONS_MACOS,
          ARTIFACT_ID_EXCEPTIONS_WINDOWS,
          ARTIFACT_ID_EXCEPTIONS_LINUX,
        ],
        created: '20-01-2020 10:00:00.000Z',
        id: '3',
      },
      {
        policyId: TEST_POLICY_ID_1,
        semanticVersion: '1.0.0',
        artifactIds: [
          ARTIFACT_ID_EXCEPTIONS_WINDOWS,
          ARTIFACT_ID_TRUSTED_APPS_MACOS,
          ARTIFACT_ID_TRUSTED_APPS_WINDOWS,
        ],
        created: '20-01-2020 10:00:00.000Z',
        id: '1',
      },
      {
        policyId: TEST_POLICY_ID_2,
        semanticVersion: '1.0.0',
        artifactIds: [ARTIFACT_ID_TRUSTED_APPS_WINDOWS],
        created: '20-01-2020 10:00:00.000Z',
        id: '2',
      },
    ]);

    test('Retrieves empty unified manifest successfully', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({
          savedObjectsClient,
          experimentalFeatures: ['unifiedManifestEnabled'],
        })
      );

      manifestManager.getAllUnifiedManifestsSO = jest.fn().mockImplementation(() => []);

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toStrictEqual('WzQ3NzAsMV0=');
      expect(manifest?.getAllArtifacts()).toStrictEqual([]);
    });

    test('Retrieves empty unified manifest successfully but uses semanticVersion from existing legacy SO manifest', async () => {
      const semanticVersion = '1.14.0';
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({
          savedObjectsClient,
          experimentalFeatures: ['unifiedManifestEnabled'],
        })
      );

      savedObjectsClient.get = jest.fn().mockImplementation(async (objectType: string) => {
        if (objectType === ManifestConstants.SAVED_OBJECT_TYPE) {
          return {
            attributes: {
              artifacts: [
                { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
                { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: undefined },
              ],
              semanticVersion,
            },
          };
        } else {
          return null;
        }
      });

      manifestManager.getAllUnifiedManifestsSO = jest.fn().mockImplementation(() => []);

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual(semanticVersion);
      expect(manifest?.getSavedObjectVersion()).toStrictEqual('WzQ3NzAsMV0=');
      expect(manifest?.getAllArtifacts()).toStrictEqual([]);
    });

    test('Retrieves non empty manifest succesfully from Unified Saved Object', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManagerContext = buildManifestManagerContextMock({
        savedObjectsClient,
        experimentalFeatures: ['unifiedManifestEnabled'],
      });
      const manifestManager = new ManifestManager(manifestManagerContext);

      (
        manifestManagerContext.artifactClient as jest.Mocked<EndpointArtifactClientInterface>
      ).fetchAll.mockReturnValue(createFetchAllArtifactsIterableMock([ARTIFACTS as Artifact[]]));

      manifestManager.getAllUnifiedManifestsSO = mockGetAllUnifiedManifestsSOFromCache;

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toStrictEqual('WzQ3NzAsMV0=');
      expect(manifest?.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 5));
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

    test("Retrieve non empty unified manifest and skips over artifacts that can't be found", async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManagerContext = buildManifestManagerContextMock({
        savedObjectsClient,
        experimentalFeatures: ['unifiedManifestEnabled'],
      });
      const manifestManager = new ManifestManager(manifestManagerContext);

      manifestManager.getAllUnifiedManifestsSO = mockGetAllUnifiedManifestsSOFromCache;

      (
        manifestManagerContext.artifactClient as jest.Mocked<EndpointArtifactClientInterface>
      ).fetchAll.mockReturnValue(
        createFetchAllArtifactsIterableMock([
          // report the MACOS Exceptions artifact as not found
          [
            ARTIFACT_TRUSTED_APPS_MACOS,
            ARTIFACT_EXCEPTIONS_WINDOWS,
            ARTIFACT_TRUSTED_APPS_WINDOWS,
            ARTIFACTS_BY_ID[ARTIFACT_ID_EXCEPTIONS_LINUX],
          ] as Artifact[],
        ])
      );

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(1, 5));

      expect(manifestManagerContext.logger.warn).toHaveBeenCalledWith(
        "Missing artifacts detected! Internal artifact manifest (SavedObject version [WzQ3NzAsMV0=]) references [1] artifact IDs that don't exist.\n" +
          "First 10 below (run with logging set to 'debug' to see all):\n" +
          'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });
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
      const error = { message: 'bad request', output: { statusCode: 500 } };

      savedObjectsClient.get = jest.fn().mockRejectedValue(error);

      await expect(manifestManager.getLastComputedManifest()).rejects.toThrow(
        new EndpointError('bad request', error)
      );
    });

    test('Throws error when no version on the manifest', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManager = new ManifestManager(
        buildManifestManagerContextMock({ savedObjectsClient })
      );

      savedObjectsClient.get = jest.fn().mockResolvedValue({});

      await expect(manifestManager.getLastComputedManifest()).rejects.toStrictEqual(
        new InvalidInternalManifestError('Internal Manifest map SavedObject is missing version')
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
      const manifestManagerContext = buildManifestManagerContextMock({ savedObjectsClient });
      const manifestManager = new ManifestManager(manifestManagerContext);

      savedObjectsClient.get = jest.fn().mockImplementation(async (objectType: string) => {
        if (objectType === ManifestConstants.SAVED_OBJECT_TYPE) {
          return {
            attributes: {
              created: '20-01-2020 10:00:00.000Z',
              schemaVersion: 'v2',
              semanticVersion: '1.0.0',
              artifacts: [
                { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
                { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: undefined },
                { artifactId: ARTIFACT_ID_EXCEPTIONS_LINUX, policyId: undefined },
                { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: TEST_POLICY_ID_1 },
                { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_1 },
                { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_1 },
                { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_2 },
              ],
            },
            version: '2.0.0',
          };
        } else {
          return null;
        }
      });

      (
        manifestManagerContext.artifactClient as jest.Mocked<EndpointArtifactClientInterface>
      ).fetchAll.mockReturnValue(createFetchAllArtifactsIterableMock([ARTIFACTS as Artifact[]]));

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toStrictEqual('2.0.0');
      expect(manifest?.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(0, 5));
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

    test("Retrieve non empty manifest and skips over artifacts that can't be found", async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      const manifestManagerContext = buildManifestManagerContextMock({ savedObjectsClient });
      const manifestManager = new ManifestManager(manifestManagerContext);

      savedObjectsClient.get = jest.fn().mockImplementation(async (objectType: string) => {
        if (objectType === ManifestConstants.SAVED_OBJECT_TYPE) {
          return {
            attributes: {
              created: '20-01-2020 10:00:00.000Z',
              schemaVersion: 'v2',
              semanticVersion: '1.0.0',
              artifacts: [
                { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
                { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: undefined },
                { artifactId: ARTIFACT_ID_EXCEPTIONS_LINUX, policyId: undefined },
                { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: TEST_POLICY_ID_1 },
                { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_1 },
                { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_1 },
                { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_2 },
              ],
            },
            version: '2.0.0',
          };
        } else {
          return null;
        }
      });

      (
        manifestManagerContext.artifactClient as jest.Mocked<EndpointArtifactClientInterface>
      ).fetchAll.mockReturnValue(
        createFetchAllArtifactsIterableMock([
          // report the MACOS Exceptions artifact as not found
          [
            ARTIFACT_TRUSTED_APPS_MACOS,
            ARTIFACT_EXCEPTIONS_WINDOWS,
            ARTIFACT_TRUSTED_APPS_WINDOWS,
            ARTIFACTS_BY_ID[ARTIFACT_ID_EXCEPTIONS_LINUX],
          ] as Artifact[],
        ])
      );

      const manifest = await manifestManager.getLastComputedManifest();

      expect(manifest?.getAllArtifacts()).toStrictEqual(ARTIFACTS.slice(1, 5));

      expect(manifestManagerContext.logger.warn).toHaveBeenCalledWith(
        "Missing artifacts detected! Internal artifact manifest (SavedObject version [2.0.0]) references [1] artifact IDs that don't exist.\n" +
          "First 10 below (run with logging set to 'debug' to see all):\n" +
          'endpoint-exceptionlist-macos-v1-96b76a1a911662053a1562ac14c4ff1e87c2ff550d6fe52e1e0b3790526597d3'
      );
    });
  });

  describe('commit unified manifest', () => {
    test('Correctly updates, creates and deletes unified manifest so', async () => {
      const context = buildManifestManagerContextMock({
        experimentalFeatures: ['unifiedManifestEnabled'],
      });
      const manifestManager = new ManifestManager(context);
      const manifest = ManifestManager.createDefaultManifest();

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      manifestManager.getAllUnifiedManifestsSO = jest.fn().mockImplementation(() => [
        {
          policyId: '.global',
          semanticVersion: '1.0.0',
          artifactIds: [ARTIFACT_ID_EXCEPTIONS_MACOS],
          created: '20-01-2020 10:00:00.000Z',
          id: '2',
        },
        {
          policyId: TEST_POLICY_ID_1,
          semanticVersion: '1.0.0',
          artifactIds: [ARTIFACT_ID_EXCEPTIONS_MACOS, ARTIFACT_ID_TRUSTED_APPS_MACOS],
          created: '20-01-2020 10:00:00.000Z',
          id: '3',
        },
        {
          policyId: 'non-existent-policy',
          semanticVersion: '1.0.0',
          artifactIds: [ARTIFACT_ID_EXCEPTIONS_WINDOWS],
          created: '20-01-2020 10:00:00.000Z',
          id: '4',
        },
      ]);

      context.savedObjectsClient.bulkCreate = jest.fn();
      context.savedObjectsClient.bulkUpdate = jest.fn();
      context.savedObjectsClient.bulkDelete = jest.fn();
      manifestManager.bumpGlobalUnifiedManifestVersion = jest.fn();

      await expect(manifestManager.commit(manifest)).resolves.toBeUndefined();
      expect(context.savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      // TEST_POLICY_ID_1 and .global exists, shouldn't be created
      expect(context.savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            attributes: {
              artifactIds: [ARTIFACT_ID_EXCEPTIONS_WINDOWS, ARTIFACT_ID_TRUSTED_APPS_MACOS],
              id: undefined,
              policyId: TEST_POLICY_ID_2,
              semanticVersion: '1.0.0',
            },
            type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
          },
        ],
        { initialNamespaces: ['*'] }
      );

      expect(context.savedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      // TEST_POLICY_ID_1 is updated, global is not due to no changes
      expect(context.savedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
        {
          attributes: {
            artifactIds: [
              ARTIFACT_ID_EXCEPTIONS_MACOS,
              ARTIFACT_ID_TRUSTED_APPS_WINDOWS,
              ARTIFACT_ID_TRUSTED_APPS_MACOS,
            ],
            policyId: TEST_POLICY_ID_1,
            semanticVersion: '1.0.1',
          },
          id: '3',
          type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
        },
      ]);

      // non-existent-policy should be deleted for not being in the manifest
      expect(context.savedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
      expect(context.savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { id: '4', type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE },
      ]);
      // Global manifest wasn't updated, manual bump is required
      expect(manifestManager.bumpGlobalUnifiedManifestVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('commit', () => {
    test('Creates new saved object if no saved object version', async () => {
      const context = buildManifestManagerContextMock({});
      const manifestManager = new ManifestManager(context);
      const manifest = ManifestManager.createDefaultManifest();

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      context.savedObjectsClient.create = jest
        .fn()
        .mockImplementation((_type: string, object: InternalManifestSchema) => object);

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
        .mockImplementation((_type: string, _id: string, object: InternalManifestSchema) => object);

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

  describe.each([true, false])('buildNewManifest', (unifiedManifestSO) => {
    const SUPPORTED_ARTIFACT_NAMES = [
      ARTIFACT_NAME_EXCEPTIONS_MACOS,
      ARTIFACT_NAME_EXCEPTIONS_WINDOWS,
      ARTIFACT_NAME_EXCEPTIONS_LINUX,
      ARTIFACT_NAME_TRUSTED_APPS_MACOS,
      ARTIFACT_NAME_TRUSTED_APPS_WINDOWS,
      ARTIFACT_NAME_TRUSTED_APPS_LINUX,
      ARTIFACT_NAME_EVENT_FILTERS_MACOS,
      ARTIFACT_NAME_EVENT_FILTERS_WINDOWS,
      ARTIFACT_NAME_EVENT_FILTERS_LINUX,
      ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_MACOS,
      ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_WINDOWS,
      ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_LINUX,
      ARTIFACT_NAME_BLOCKLISTS_MACOS,
      ARTIFACT_NAME_BLOCKLISTS_WINDOWS,
      ARTIFACT_NAME_BLOCKLISTS_LINUX,
    ];

    const getArtifactIds = (artifacts: InternalArtifactSchema[]) => [
      ...new Set(artifacts.map((artifact) => artifact.identifier)).values(),
    ];

    test(`Fails when exception list client fails when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = jest.fn().mockRejectedValue(new Error());

      await expect(manifestManager.buildNewManifest()).rejects.toThrow();
    });

    test(`Builds fully new manifest if no baseline parameter passed and no exception list items when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({});
      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(15);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      for (const artifact of artifacts) {
        expect(getArtifactObject(artifact)).toStrictEqual({ entries: [] });
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test(`Builds fully new manifest if no baseline parameter passed and present exception list items when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const eventFiltersListItem = getExceptionListItemSchemaMock({
        os_types: ['windows'],
        tags: ['policy:all'],
      });
      const hostIsolationExceptionsItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const blocklistsListItem = getExceptionListItemSchemaMock({
        os_types: ['macos'],
        tags: ['policy:all'],
      });
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: { linux: [trustedAppListItem] },
        [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: { linux: [eventFiltersListItem] },
        [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]: {
          linux: [hostIsolationExceptionsItem],
        },
        [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: { linux: [blocklistsListItem] },
      });

      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(15);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      expect(getArtifactObject(artifacts[0])).toStrictEqual({
        entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[1])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[2])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[3])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[4])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[5])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[6])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[7])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[8])).toStrictEqual({
        entries: translateToEndpointExceptions([eventFiltersListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[9])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[10])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[11])).toStrictEqual({
        entries: translateToEndpointExceptions([hostIsolationExceptionsItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[12])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[13])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[14])).toStrictEqual({
        entries: translateToEndpointExceptions([blocklistsListItem], 'v1'),
      });

      for (const artifact of artifacts) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test(`Reuses artifacts when baseline parameter passed and present exception list items when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const eventFiltersListItem = getExceptionListItemSchemaMock({
        os_types: ['windows'],
        tags: ['policy:all'],
      });
      const hostIsolationExceptionsItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const blocklistsListItem = getExceptionListItemSchemaMock({
        os_types: ['macos'],
        tags: ['policy:all'],
      });
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
      });
      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      const oldManifest = await manifestManager.buildNewManifest();

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: { linux: [trustedAppListItem] },
        [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: { linux: [eventFiltersListItem] },
        [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]: {
          linux: [hostIsolationExceptionsItem],
        },
        [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: { linux: [blocklistsListItem] },
      });

      const manifest = await manifestManager.buildNewManifest(oldManifest);

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(15);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      expect(artifacts[0]).toStrictEqual(oldManifest.getAllArtifacts()[0]);
      expect(getArtifactObject(artifacts[1])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[2])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[3])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[4])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[5])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[6])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[7])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[8])).toStrictEqual({
        entries: translateToEndpointExceptions([eventFiltersListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[9])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[10])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[11])).toStrictEqual({
        entries: translateToEndpointExceptions([hostIsolationExceptionsItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[12])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[13])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[14])).toStrictEqual({
        entries: translateToEndpointExceptions([blocklistsListItem], 'v1'),
      });

      for (const artifact of artifacts) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test(`Builds fully new manifest with single entries when they are duplicated when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const eventFiltersListItem = getExceptionListItemSchemaMock({
        os_types: ['windows'],
        tags: [`policy:${TEST_POLICY_ID_1}`],
      });
      const hostIsolationExceptionsItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const blocklistsListItem = getExceptionListItemSchemaMock({
        os_types: ['macos'],
        tags: ['policy:all'],
      });
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      const duplicatedEventFilterInDifferentPolicy = {
        ...eventFiltersListItem,
        tags: [`policy:${TEST_POLICY_ID_2}`],
      };
      const duplicatedEndpointExceptionInDifferentOS: ExceptionListItemSchema = {
        ...exceptionListItem,
        os_types: ['windows'],
      };
      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: {
          macos: [exceptionListItem, exceptionListItem],
          windows: [duplicatedEndpointExceptionInDifferentOS],
        },
        [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: {
          linux: [trustedAppListItem, trustedAppListItem],
        },
        [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: {
          windows: [eventFiltersListItem, duplicatedEventFilterInDifferentPolicy],
        },
        [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]: {
          linux: [
            hostIsolationExceptionsItem,
            { ...hostIsolationExceptionsItem, tags: [`policy:${TEST_POLICY_ID_2}`] },
          ],
        },
        [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: {
          macos: [blocklistsListItem, blocklistsListItem],
        },
      });

      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
        TEST_POLICY_ID_2,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(16);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      expect(getArtifactObject(artifacts[0])).toStrictEqual({
        entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[1])).toStrictEqual({
        entries: translateToEndpointExceptions([duplicatedEndpointExceptionInDifferentOS], 'v1'),
      });
      expect(getArtifactObject(artifacts[2])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[3])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[4])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[5])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[6])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[7])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[8])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[9])).toStrictEqual({
        entries: translateToEndpointExceptions(
          [eventFiltersListItem, duplicatedEventFilterInDifferentPolicy],
          'v1'
        ),
      });
      expect(getArtifactObject(artifacts[10])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[11])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[12])).toStrictEqual({
        entries: translateToEndpointExceptions([hostIsolationExceptionsItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[13])).toStrictEqual({
        entries: translateToEndpointExceptions([blocklistsListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[14])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[15])).toStrictEqual({ entries: [] });

      // Default artifacts used by both policies
      for (const artifact of artifacts.slice(0, 7)) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
        );
      }

      // Default event filters artifact for windows not used by test policies
      expect(manifest.isDefaultArtifact(artifacts[7])).toBe(true);
      expect(manifest.getArtifactTargetPolicies(artifacts[7])).toStrictEqual(new Set([]));

      // Default event filters artifact for linux used by both policies
      expect(manifest.isDefaultArtifact(artifacts[8])).toBe(true);
      expect(manifest.getArtifactTargetPolicies(artifacts[8])).toStrictEqual(
        new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
      );

      // Policy specific event filters artifact for windows used by both policies
      expect(manifest.isDefaultArtifact(artifacts[9])).toBe(false);
      expect(manifest.getArtifactTargetPolicies(artifacts[9])).toStrictEqual(
        new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
      );

      // Default artifacts used by both policies
      for (const artifact of artifacts.slice(10)) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
        );
      }
    });

    test(`Builds manifest with policy specific exception list items for trusted apps when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const trustedAppListItemPolicy2 = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        entries: [
          { field: 'other.field', operator: 'included', type: 'match', value: 'other value' },
        ],
        tags: [`policy:${TEST_POLICY_ID_2}`],
      });
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: {
          linux: [trustedAppListItem, trustedAppListItemPolicy2],
        },
      });
      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
        TEST_POLICY_ID_2,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(16);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      expect(getArtifactObject(artifacts[0])).toStrictEqual({
        entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[1])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[2])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[3])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[4])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[5])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[6])).toStrictEqual({
        entries: translateToEndpointExceptions(
          [trustedAppListItem, trustedAppListItemPolicy2],
          'v1'
        ),
      });
      expect(getArtifactObject(artifacts[7])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[8])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[9])).toStrictEqual({ entries: [] });

      for (const artifact of artifacts.slice(0, 5)) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1, TEST_POLICY_ID_2])
        );
      }

      expect(manifest.isDefaultArtifact(artifacts[6])).toBe(false);
      expect(manifest.getArtifactTargetPolicies(artifacts[6])).toStrictEqual(
        new Set([TEST_POLICY_ID_2])
      );
    });
  });

  describe.each([true, false])('buildNewManifest when using app features', (unifiedManifestSO) => {
    const SUPPORTED_ARTIFACT_NAMES = [
      ARTIFACT_NAME_EXCEPTIONS_MACOS,
      ARTIFACT_NAME_EXCEPTIONS_WINDOWS,
      ARTIFACT_NAME_EXCEPTIONS_LINUX,
      ARTIFACT_NAME_TRUSTED_APPS_MACOS,
      ARTIFACT_NAME_TRUSTED_APPS_WINDOWS,
      ARTIFACT_NAME_TRUSTED_APPS_LINUX,
      ARTIFACT_NAME_EVENT_FILTERS_MACOS,
      ARTIFACT_NAME_EVENT_FILTERS_WINDOWS,
      ARTIFACT_NAME_EVENT_FILTERS_LINUX,
      ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_MACOS,
      ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_WINDOWS,
      ARTIFACT_NAME_HOST_ISOLATION_EXCEPTIONS_LINUX,
      ARTIFACT_NAME_BLOCKLISTS_MACOS,
      ARTIFACT_NAME_BLOCKLISTS_WINDOWS,
      ARTIFACT_NAME_BLOCKLISTS_LINUX,
    ];

    const getArtifactIds = (artifacts: InternalArtifactSchema[]) => [
      ...new Set(artifacts.map((artifact) => artifact.identifier)).values(),
    ];

    test(`when it has endpoint artifact management app feature it should not generate host isolation exceptions when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const eventFiltersListItem = getExceptionListItemSchemaMock({
        os_types: ['windows'],
        tags: ['policy:all'],
      });
      const hostIsolationExceptionsItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const blocklistsListItem = getExceptionListItemSchemaMock({
        os_types: ['macos'],
        tags: ['policy:all'],
      });
      const context = buildManifestManagerContextMock(
        { ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}) },
        [ProductFeatureSecurityKey.endpointArtifactManagement]
      );
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: { linux: [trustedAppListItem] },
        [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: { linux: [eventFiltersListItem] },
        [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]: {
          linux: [hostIsolationExceptionsItem],
        },
        [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: { linux: [blocklistsListItem] },
      });

      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(15);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      expect(getArtifactObject(artifacts[0])).toStrictEqual({
        entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[1])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[2])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[3])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[4])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[5])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[6])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[7])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[8])).toStrictEqual({
        entries: translateToEndpointExceptions([eventFiltersListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[9])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[10])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[11])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[12])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[13])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[14])).toStrictEqual({
        entries: translateToEndpointExceptions([blocklistsListItem], 'v1'),
      });

      for (const artifact of artifacts) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test(`when it has endpoint artifact management and response actions app features it should generate all exceptions when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const eventFiltersListItem = getExceptionListItemSchemaMock({
        os_types: ['windows'],
        tags: ['policy:all'],
      });
      const hostIsolationExceptionsItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const blocklistsListItem = getExceptionListItemSchemaMock({
        os_types: ['macos'],
        tags: ['policy:all'],
      });
      const context = buildManifestManagerContextMock(
        { ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}) },
        [
          ProductFeatureSecurityKey.endpointArtifactManagement,
          ProductFeatureSecurityKey.endpointResponseActions,
        ]
      );
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: { linux: [trustedAppListItem] },
        [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: { linux: [eventFiltersListItem] },
        [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]: {
          linux: [hostIsolationExceptionsItem],
        },
        [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: { linux: [blocklistsListItem] },
      });

      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(15);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      expect(getArtifactObject(artifacts[0])).toStrictEqual({
        entries: translateToEndpointExceptions([exceptionListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[1])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[2])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[3])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[4])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[5])).toStrictEqual({
        entries: translateToEndpointExceptions([trustedAppListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[6])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[7])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[8])).toStrictEqual({
        entries: translateToEndpointExceptions([eventFiltersListItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[9])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[10])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[11])).toStrictEqual({
        entries: translateToEndpointExceptions([hostIsolationExceptionsItem], 'v1'),
      });
      expect(getArtifactObject(artifacts[12])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[13])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[14])).toStrictEqual({
        entries: translateToEndpointExceptions([blocklistsListItem], 'v1'),
      });

      for (const artifact of artifacts) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });

    test(`when does not have right app features, should not generate any exception when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const exceptionListItem = getExceptionListItemSchemaMock({ os_types: ['macos'] });
      const trustedAppListItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const eventFiltersListItem = getExceptionListItemSchemaMock({
        os_types: ['windows'],
        tags: ['policy:all'],
      });
      const hostIsolationExceptionsItem = getExceptionListItemSchemaMock({
        os_types: ['linux'],
        tags: ['policy:all'],
      });
      const blocklistsListItem = getExceptionListItemSchemaMock({
        os_types: ['macos'],
        tags: ['policy:all'],
      });
      const context = buildManifestManagerContextMock(
        { ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}) },
        []
      );
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
        [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        [ENDPOINT_ARTIFACT_LISTS.trustedApps.id]: { linux: [trustedAppListItem] },
        [ENDPOINT_ARTIFACT_LISTS.eventFilters.id]: { linux: [eventFiltersListItem] },
        [ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id]: {
          linux: [hostIsolationExceptionsItem],
        },
        [ENDPOINT_ARTIFACT_LISTS.blocklists.id]: { linux: [blocklistsListItem] },
      });

      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      const manifest = await manifestManager.buildNewManifest();

      expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
      expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
      expect(manifest?.getSavedObjectVersion()).toBeUndefined();

      const artifacts = manifest.getAllArtifacts();

      expect(artifacts.length).toBe(15);
      expect(getArtifactIds(artifacts)).toStrictEqual(SUPPORTED_ARTIFACT_NAMES);

      expect(getArtifactObject(artifacts[0])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[1])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[2])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[3])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[4])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[5])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[6])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[7])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[8])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[9])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[10])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[11])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[12])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[13])).toStrictEqual({ entries: [] });
      expect(getArtifactObject(artifacts[14])).toStrictEqual({ entries: [] });

      for (const artifact of artifacts) {
        expect(manifest.isDefaultArtifact(artifact)).toBe(true);
        expect(manifest.getArtifactTargetPolicies(artifact)).toStrictEqual(
          new Set([TEST_POLICY_ID_1])
        );
      }
    });
  });

  describe.each([true, false])(
    'buildNewManifest when Endpoint Exceptions contain `matches`',
    (unifiedManifestSO) => {
      test(`when contains only \`wildcard\`, \`event.module=endpoint\` is added when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
        const exceptionListItem = getExceptionListItemSchemaMock({
          os_types: ['macos'],
          entries: [
            { type: 'wildcard', operator: 'included', field: 'path', value: '*match_me*' },
            { type: 'wildcard', operator: 'excluded', field: 'not_path', value: '*dont_match_me*' },
          ],
        });
        const expectedExceptionListItem = getExceptionListItemSchemaMock({
          os_types: ['macos'],
          entries: [
            ...exceptionListItem.entries,
            { type: 'match', operator: 'included', field: 'event.module', value: 'endpoint' },
          ],
        });

        const context = buildManifestManagerContextMock({
          ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
        });
        const manifestManager = new ManifestManager(context);

        context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
          [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        });

        context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
          TEST_POLICY_ID_1,
        ]);

        const manifest = await manifestManager.buildNewManifest();

        expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
        expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
        expect(manifest?.getSavedObjectVersion()).toBeUndefined();

        const artifacts = manifest.getAllArtifacts();

        expect(artifacts.length).toBe(15);

        expect(getArtifactObject(artifacts[0])).toStrictEqual({
          entries: translateToEndpointExceptions([expectedExceptionListItem], 'v1'),
        });
      });

      test(`when contains anything next to \`wildcard\`, nothing is added when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
        const exceptionListItem = getExceptionListItemSchemaMock({
          os_types: ['macos'],
          entries: [
            { type: 'wildcard', operator: 'included', field: 'path', value: '*match_me*' },
            { type: 'wildcard', operator: 'excluded', field: 'path', value: '*dont_match_me*' },
            { type: 'match', operator: 'included', field: 'path', value: 'something' },
          ],
        });
        const expectedExceptionListItem = getExceptionListItemSchemaMock({
          os_types: ['macos'],
          entries: [...exceptionListItem.entries],
        });

        const context = buildManifestManagerContextMock({
          ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
        });
        const manifestManager = new ManifestManager(context);

        context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({
          [ENDPOINT_LIST_ID]: { macos: [exceptionListItem] },
        });

        context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
          TEST_POLICY_ID_1,
        ]);

        const manifest = await manifestManager.buildNewManifest();

        expect(manifest?.getSchemaVersion()).toStrictEqual('v1');
        expect(manifest?.getSemanticVersion()).toStrictEqual('1.0.0');
        expect(manifest?.getSavedObjectVersion()).toBeUndefined();

        const artifacts = manifest.getAllArtifacts();

        expect(artifacts.length).toBe(15);

        expect(getArtifactObject(artifacts[0])).toStrictEqual({
          entries: translateToEndpointExceptions([expectedExceptionListItem], 'v1'),
        });
      });
    }
  );

  describe.each([true, false])('deleteArtifacts', (unifiedManifestSO) => {
    test(`Successfully invokes saved objects client when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      await expect(
        manifestManager.deleteArtifacts([
          ARTIFACT_ID_EXCEPTIONS_MACOS,
          ARTIFACT_ID_EXCEPTIONS_WINDOWS,
        ])
      ).resolves.toStrictEqual([]);

      expect(context.artifactClient.bulkDeleteArtifacts).toHaveBeenCalledWith([
        ARTIFACT_ID_EXCEPTIONS_MACOS,
        ARTIFACT_ID_EXCEPTIONS_WINDOWS,
      ]);
    });

    test(`Returns errors for partial failures when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const artifactClient = context.artifactClient as jest.Mocked<EndpointArtifactClientInterface>;
      const manifestManager = new ManifestManager(context);
      const error = new Error();

      artifactClient.bulkDeleteArtifacts.mockImplementation(async (ids): Promise<Error[]> => {
        if (ids[1] === ARTIFACT_ID_EXCEPTIONS_WINDOWS) {
          return [error];
        }
        return [];
      });

      await expect(
        manifestManager.deleteArtifacts([
          ARTIFACT_ID_EXCEPTIONS_MACOS,
          ARTIFACT_ID_EXCEPTIONS_WINDOWS,
        ])
      ).resolves.toStrictEqual([error]);

      expect(artifactClient.bulkDeleteArtifacts).toHaveBeenCalledTimes(1);
      expect(context.artifactClient.bulkDeleteArtifacts).toHaveBeenCalledWith([
        ARTIFACT_ID_EXCEPTIONS_MACOS,
        ARTIFACT_ID_EXCEPTIONS_WINDOWS,
      ]);
    });
  });

  describe.each([true, false])('pushArtifacts', (unifiedManifestSO) => {
    test(`Successfully invokes artifactClient when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const artifactClient = context.artifactClient as jest.Mocked<EndpointArtifactClientInterface>;
      const manifestManager = new ManifestManager(context);
      const newManifest = ManifestManager.createDefaultManifest();

      await expect(
        manifestManager.pushArtifacts(
          [ARTIFACT_EXCEPTIONS_MACOS, ARTIFACT_EXCEPTIONS_WINDOWS],
          newManifest
        )
      ).resolves.toStrictEqual([]);

      expect(artifactClient.bulkCreateArtifacts).toHaveBeenCalledWith([
        {
          ...ARTIFACT_EXCEPTIONS_MACOS,
        },
        {
          ...ARTIFACT_EXCEPTIONS_WINDOWS,
        },
      ]);
    });

    test(`Returns errors for partial failures when unifiedManifestEnabled feature flag is set to: ${unifiedManifestSO}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedManifestSO ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const artifactClient = context.artifactClient as jest.Mocked<EndpointArtifactClientInterface>;
      const manifestManager = new ManifestManager(context);
      const newManifest = ManifestManager.createDefaultManifest();
      const error = new Error();
      const { body, ...incompleteArtifact } = ARTIFACT_TRUSTED_APPS_MACOS;

      artifactClient.bulkCreateArtifacts.mockImplementation(
        async (artifacts: InternalArtifactCompleteSchema[]) => {
          return { artifacts: [artifacts[0]], errors: [error] };
        }
      );

      await expect(
        manifestManager.pushArtifacts(
          [
            ARTIFACT_EXCEPTIONS_MACOS,
            ARTIFACT_EXCEPTIONS_WINDOWS,
            incompleteArtifact as InternalArtifactCompleteSchema,
          ],
          newManifest
        )
      ).resolves.toStrictEqual([
        new EndpointError(
          `Incomplete artifact: ${ARTIFACT_ID_TRUSTED_APPS_MACOS}`,
          ARTIFACTS_BY_ID[ARTIFACT_ID_TRUSTED_APPS_MACOS]
        ),
        error,
      ]);

      expect(artifactClient.bulkCreateArtifacts).toHaveBeenCalledWith([
        {
          ...ARTIFACT_EXCEPTIONS_MACOS,
        },
        {
          ...ARTIFACT_EXCEPTIONS_WINDOWS,
        },
      ]);
    });
  });

  describe.each([true, false])('tryDispatch', (unifiedSavedObject) => {
    const getMockPolicyFetchAllItems = (items: PackagePolicy[]) =>
      jest.fn(async function* () {
        yield items;
      });

    test(`Should not dispatch if no policies when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);
      const manifest = new Manifest({ soVersion: '1.0.0' });

      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      context.packagePolicyService.fetchAllItems = getMockPolicyFetchAllItems([]);

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.bulkUpdate).toHaveBeenCalledTimes(0);
    });

    test(`Should return errors if invalid config for package policy when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      context.packagePolicyService.fetchAllItems = getMockPolicyFetchAllItems([
        createPackagePolicyWithConfigMock({ id: TEST_POLICY_ID_1 }),
      ]);

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([
        new EndpointError(`Package Policy ${TEST_POLICY_ID_1} has no 'inputs[0].config'`),
      ]);

      expect(context.packagePolicyService.bulkUpdate).toHaveBeenCalledTimes(0);
    });

    test(`Should not dispatch if semantic version has not changed when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      context.packagePolicyService.fetchAllItems = getMockPolicyFetchAllItems([
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

      expect(context.packagePolicyService.bulkUpdate).toHaveBeenCalledTimes(0);
    });

    test(`Should dispatch to only policies where list of artifacts changed when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      context.packagePolicyService.fetchAllItems = getMockPolicyFetchAllItems([
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
      context.packagePolicyService.bulkUpdate = jest.fn().mockResolvedValue({});

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(context.packagePolicyService.bulkUpdate).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        context.esClient,
        [
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
          }),
        ]
      );
    });

    test(`Should dispatch to only policies where artifact content changed when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      const manifest = new Manifest({ soVersion: '1.0.0', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);

      context.packagePolicyService.fetchAllItems = getMockPolicyFetchAllItems([
        createPackagePolicyWithConfigMock({
          id: TEST_POLICY_ID_1,
          config: {
            artifact_manifest: {
              value: {
                artifacts: toArtifactRecords({
                  [ARTIFACT_NAME_EXCEPTIONS_MACOS]: await getEmptyInternalArtifactMock(
                    'macos',
                    'v1'
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
      context.packagePolicyService.bulkUpdate = jest.fn().mockResolvedValue({});

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([]);

      expect(context.packagePolicyService.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(context.packagePolicyService.bulkUpdate).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        context.esClient,
        [
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
          }),
        ]
      );
    });

    test(`Should return partial errors when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);
      const error = new Error();

      const manifest = new Manifest({ soVersion: '1.0.0', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      context.packagePolicyService.fetchAllItems = getMockPolicyFetchAllItems([
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
      context.packagePolicyService.bulkUpdate = jest
        .fn()
        .mockResolvedValue({ updatedPolicies: [{}], failedPolicies: [{ error }] });

      await expect(manifestManager.tryDispatch(manifest)).resolves.toStrictEqual([error]);

      expect(context.packagePolicyService.bulkUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe.each([true, false])('cleanup artifacts', (unifiedSavedObject) => {
    test(`Successfully removes orphan artifacts when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      (context.artifactClient.fetchAll as jest.Mock).mockReturnValue(
        createFetchAllArtifactsIterableMock([[generateArtifactMock()]])
      );

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({});
      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      context.savedObjectsClient.create = jest
        .fn()
        .mockImplementation((_type: string, object: InternalManifestSchema) => ({
          attributes: object,
        }));
      const manifest = await manifestManager.buildNewManifest();

      await manifestManager.cleanup(manifest);
      const artifactToBeRemoved = await context.artifactClient.getArtifact('');
      expect(artifactToBeRemoved).not.toBeUndefined();

      expect(context.artifactClient.bulkDeleteArtifacts).toHaveBeenCalledWith([
        getArtifactId(artifactToBeRemoved!),
      ]);
    });

    test(`When there is no artifact to be removed when unifiedManifestEnabled feature flag is set to: ${unifiedSavedObject}`, async () => {
      const context = buildManifestManagerContextMock({
        ...(unifiedSavedObject ? { experimentalFeatures: ['unifiedManifestEnabled'] } : {}),
      });
      const manifestManager = new ManifestManager(context);

      context.exceptionListClient.findExceptionListItem = mockFindExceptionListItemResponses({});
      context.packagePolicyService.fetchAllItemIds = getMockPolicyFetchAllItemIds([
        TEST_POLICY_ID_1,
      ]);

      context.savedObjectsClient.create = jest
        .fn()
        .mockImplementation((_type: string, object: InternalManifestSchema) => ({
          attributes: object,
        }));

      context.artifactClient.listArtifacts = jest.fn().mockResolvedValue([
        {
          id: '123',
          type: 'trustlist',
          identifier: 'endpoint-trustlist-windows-v1',
          packageName: 'endpoint',
          encryptionAlgorithm: 'none',
          relative_url: '/api/fleet/artifacts/trustlist-v1/d801aa1fb',
          compressionAlgorithm: 'zlib',
          decodedSha256: 'd801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658',
          decodedSize: 14,
          encodedSha256: 'd29238d40',
          encodedSize: 22,
          body: 'eJyrVkrNKynKTC1WsoqOrQUAJxkFKQ==',
          created: '2021-03-08T14:47:13.714Z',
        },
      ]);
      const manifest = await manifestManager.buildNewManifest();

      await manifestManager.cleanup(manifest);

      expect(context.artifactClient.bulkDeleteArtifacts).toHaveBeenCalledTimes(0);
    });
  });

  describe('Unified Manifest Methods', () => {
    let manifestManager: ManifestManager;
    let context: ManifestManagerContext;

    beforeEach(() => {
      context = buildManifestManagerContextMock({});
      manifestManager = new ManifestManager(context);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('transforms', () => {
      const createLegacyManifestSO = (
        opts: {
          semanticVersion?: string;
        } = {}
      ) => ({
        attributes: {
          schemaVersion: 'v1' as const,
          semanticVersion: opts.semanticVersion ?? '1.0.0',
          artifacts: [
            { artifactId: ARTIFACT_ID_EXCEPTIONS_MACOS, policyId: undefined },
            { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: undefined },
            { artifactId: ARTIFACT_ID_EXCEPTIONS_LINUX, policyId: undefined },
            { artifactId: ARTIFACT_ID_EXCEPTIONS_WINDOWS, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_TRUSTED_APPS_MACOS, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_1 },
            { artifactId: ARTIFACT_ID_TRUSTED_APPS_WINDOWS, policyId: TEST_POLICY_ID_2 },
          ],
        },
        version: 'WzQ3NzAsMV0=',
      });

      const createUnifiedManifestSO = (globalSemanticVersion?: string) => [
        {
          policyId: '.global',
          semanticVersion: globalSemanticVersion ?? '1.0.0',
          artifactIds: [
            ARTIFACT_ID_EXCEPTIONS_MACOS,
            ARTIFACT_ID_EXCEPTIONS_WINDOWS,
            ARTIFACT_ID_EXCEPTIONS_LINUX,
          ],
          ...(globalSemanticVersion ? { created: '20-01-2020 10:00:00.000Z' } : {}),
          id: '3',
        },
        {
          policyId: TEST_POLICY_ID_1,
          semanticVersion: '1.0.0',
          artifactIds: [
            ARTIFACT_ID_EXCEPTIONS_WINDOWS,
            ARTIFACT_ID_TRUSTED_APPS_MACOS,
            ARTIFACT_ID_TRUSTED_APPS_WINDOWS,
          ],
          ...(globalSemanticVersion ? { created: '20-01-2020 10:00:00.000Z' } : {}),
          id: '1',
        },
        {
          policyId: TEST_POLICY_ID_2,
          semanticVersion: '1.0.0',
          artifactIds: [ARTIFACT_ID_TRUSTED_APPS_WINDOWS],
          ...(globalSemanticVersion ? { created: '20-01-2020 10:00:00.000Z' } : {}),
          id: '2',
        },
      ];

      describe('transformUnifiedManifestSOtoLegacyManifestSO', () => {
        const unifiedManifestSO = createUnifiedManifestSO('1.0.5');
        test('should transform unified manifest saved object to legacy manifest saved object', async () => {
          const expectedLegacyManifestSO = createLegacyManifestSO({ semanticVersion: '1.0.5' });

          expect(
            manifestManager.transformUnifiedManifestSOtoLegacyManifestSO(
              unifiedManifestSO as InternalUnifiedManifestSchema[]
            )
          ).toEqual(expectedLegacyManifestSO);
        });

        test('should return empty artifacts array when unified manifest saved object is empty', async () => {
          const emptyUnifiedManifestSO: InternalUnifiedManifestSchema[] = [];
          const expectedEmptyLegacyManifestSO = createLegacyManifestSO();
          expect(
            manifestManager.transformUnifiedManifestSOtoLegacyManifestSO(emptyUnifiedManifestSO)
          ).toEqual({
            ...expectedEmptyLegacyManifestSO,
            attributes: { ...expectedEmptyLegacyManifestSO.attributes, artifacts: [] },
          });
        });

        test('should return empty artifacts array when unified manifest saved object is empty but semanticVersion was provided', async () => {
          const semanticVersion = '1.14.0';
          const emptyUnifiedManifestSO: InternalUnifiedManifestSchema[] = [];
          const expectedEmptyLegacyManifestSO = createLegacyManifestSO();
          expect(
            manifestManager.transformUnifiedManifestSOtoLegacyManifestSO(
              emptyUnifiedManifestSO,
              semanticVersion
            )
          ).toEqual({
            ...expectedEmptyLegacyManifestSO,
            attributes: {
              ...expectedEmptyLegacyManifestSO.attributes,
              artifacts: [],
              semanticVersion,
            },
          });
        });
      });
      describe('transformLegacyManifestSOtoUnifiedManifestSO', () => {
        const unifiedManifestSO = createUnifiedManifestSO();
        const expectedLegacyManifestSO = createLegacyManifestSO().attributes;
        test('should properly transform legacy manifest to unified manifest saved object with empty exising unified manifest so', async () => {
          expect(
            manifestManager.transformLegacyManifestSOtoUnifiedManifestSO(
              expectedLegacyManifestSO,
              []
            )
          ).toEqual(unifiedManifestSO.map((item) => ({ ...item, id: undefined })));
        });

        test('should properly transform legacy manifest to unified manifest saved object with empty exising unified manifest so and propagate semanticVersion from the manifest', async () => {
          const semanticVersion = '1.14.0';
          const expectedLegacyManifestSOWithSemanticVersion = createLegacyManifestSO({
            semanticVersion,
          }).attributes;
          const unifiedManifestSOWithSemanticVersion = createUnifiedManifestSO(semanticVersion);

          expect(
            manifestManager.transformLegacyManifestSOtoUnifiedManifestSO(
              expectedLegacyManifestSOWithSemanticVersion,
              []
            )
          ).toEqual(
            unifiedManifestSOWithSemanticVersion.map((item) => ({
              ...item,
              id: undefined,
              created: undefined,
            }))
          );
        });

        test('should properly transform legacy manifest to unified manifest saved object with existing unified manifest so', async () => {
          const createUnifiedManifests = (empty = false) => [
            {
              policyId: '.global',
              semanticVersion: '1.0.2',
              artifactIds: !empty
                ? [
                    ARTIFACT_ID_EXCEPTIONS_MACOS,
                    ARTIFACT_ID_EXCEPTIONS_WINDOWS,
                    ARTIFACT_ID_EXCEPTIONS_LINUX,
                  ]
                : [],
              id: '3',
              ...(empty ? { created: '2000' } : {}),
            },
            {
              policyId: TEST_POLICY_ID_1,
              semanticVersion: '1.0.5',
              artifactIds: !empty
                ? [
                    ARTIFACT_ID_EXCEPTIONS_WINDOWS,
                    ARTIFACT_ID_TRUSTED_APPS_MACOS,
                    ARTIFACT_ID_TRUSTED_APPS_WINDOWS,
                  ]
                : [],
              id: '1',
              ...(empty ? { created: '2000' } : {}),
            },
            {
              policyId: TEST_POLICY_ID_2,
              semanticVersion: '1.0.1',
              artifactIds: !empty ? [ARTIFACT_ID_TRUSTED_APPS_WINDOWS] : [],
              id: '2',
              ...(empty ? { created: '2000' } : {}),
            },
          ];

          const existingUnifiedManifest = createUnifiedManifests(true);
          const output = createUnifiedManifests();

          const legacyManifest = createLegacyManifestSO().attributes;

          expect(
            manifestManager.transformLegacyManifestSOtoUnifiedManifestSO(
              legacyManifest,
              existingUnifiedManifest as InternalUnifiedManifestSchema[]
            )
          ).toEqual(output);
        });
      });
    });

    describe('prepareUnifiedManifestsSOUpdates', () => {
      const existingUnifiedManifests = ['.global', TEST_POLICY_ID_1, TEST_POLICY_ID_2].map(
        (policyId, idx) => ({
          policyId,
          semanticVersion: '1.0.0',
          artifactIds: [ARTIFACT_ID_EXCEPTIONS_WINDOWS],
          id: `${idx}`,
          created: '1',
          version: 'abc',
        })
      );

      const bumpSemanticVersion = (
        manifests: Array<Record<string, unknown>>,
        semanticVersion = '1.0.1'
      ) =>
        manifests.map((manifest) => ({
          ...manifest,
          semanticVersion,
        }));

      test('correctly selects manifests to create', () => {
        const unifiedManifest = existingUnifiedManifests.map(
          ({ id, created, ...manifest }) => manifest
        );

        const { unifiedManifestsToUpdate, unifiedManifestsToCreate, unifiedManifestsToDelete } =
          manifestManager.prepareUnifiedManifestsSOUpdates(unifiedManifest, []);

        expect(unifiedManifestsToUpdate).toEqual([]);
        expect(unifiedManifestsToCreate).toEqual(unifiedManifest);
        expect(unifiedManifestsToDelete).toEqual([]);
      });
      test('correctly selects manifests to delete', () => {
        const newUnifiedManifests = existingUnifiedManifests.slice(0, 2);

        const { unifiedManifestsToUpdate, unifiedManifestsToCreate, unifiedManifestsToDelete } =
          manifestManager.prepareUnifiedManifestsSOUpdates(
            newUnifiedManifests,
            existingUnifiedManifests
          );

        expect(unifiedManifestsToUpdate).toEqual([]);
        expect(unifiedManifestsToCreate).toEqual([]);
        expect(unifiedManifestsToDelete).toEqual([existingUnifiedManifests[2].id]);
      });
      test('correctly selects manifests to update when artifactIds changed', () => {
        const newUnifiedManifests = existingUnifiedManifests.map((manifest) => ({
          ...manifest,
          artifactIds: [ARTIFACT_ID_EXCEPTIONS_WINDOWS, ARTIFACT_ID_EXCEPTIONS_WINDOWS],
        }));

        const expectedUnifiedManifestsToUpdate = bumpSemanticVersion(newUnifiedManifests);

        const { unifiedManifestsToUpdate, unifiedManifestsToCreate, unifiedManifestsToDelete } =
          manifestManager.prepareUnifiedManifestsSOUpdates(
            newUnifiedManifests,
            existingUnifiedManifests
          );

        expect(unifiedManifestsToUpdate).toEqual(expectedUnifiedManifestsToUpdate);
        expect(unifiedManifestsToCreate).toEqual([]);
        expect(unifiedManifestsToDelete).toEqual([]);
      });

      test('correctly combines all cases', () => {
        const newUnifiedManifests = existingUnifiedManifests.slice(0, 2).map((manifest) => ({
          ...manifest,
          artifactIds: [ARTIFACT_ID_EXCEPTIONS_WINDOWS, ARTIFACT_ID_EXCEPTIONS_WINDOWS],
        }));

        const newUnifiedManifestsAddition = {
          policyId: 'test',
          semanticVersion: '1.0.0',
          artifactIds: [],
        };

        const expectedUnifiedManifestsToUpdate = bumpSemanticVersion(newUnifiedManifests);

        const expectedUnifiedManifestsToCreate = [newUnifiedManifestsAddition];

        const expectedUnifiedManifestsToDelete = [existingUnifiedManifests[2].id];

        const { unifiedManifestsToUpdate, unifiedManifestsToCreate, unifiedManifestsToDelete } =
          manifestManager.prepareUnifiedManifestsSOUpdates(
            [...newUnifiedManifests, newUnifiedManifestsAddition],
            existingUnifiedManifests
          );

        expect(unifiedManifestsToUpdate).toEqual(expectedUnifiedManifestsToUpdate);
        expect(unifiedManifestsToCreate).toEqual(expectedUnifiedManifestsToCreate);
        expect(unifiedManifestsToDelete).toEqual(expectedUnifiedManifestsToDelete);
      });
    });
    describe('bumpGlobalUnifiedManifestVersion', () => {
      const createSoFindMock = (savedObjects: Array<Record<string, unknown>>) =>
        jest.fn().mockImplementation(async (objectType: { type: string }) => {
          if (objectType.type === ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE) {
            return {
              saved_objects: savedObjects,
            };
          } else {
            return null;
          }
        });

      test('should bump the semantic version of the global manifest', async () => {
        context.savedObjectsClient.find = createSoFindMock([
          {
            id: '1',
            attributes: {
              policyId: '.global',
              semanticVersion: '1.0.1',
            },
          },
        ]);
        context.savedObjectsClient.bulkUpdate = jest.fn();
        await manifestManager.bumpGlobalUnifiedManifestVersion();
        expect(context.savedObjectsClient.bulkUpdate).toHaveBeenCalledWith([
          {
            id: '1',
            type: ManifestConstants.UNIFIED_SAVED_OBJECT_TYPE,
            attributes: {
              policyId: '.global',
              semanticVersion: '1.0.2',
            },
          },
        ]);
      });
      test('should make a clean return when no global manifest is found', async () => {
        context.savedObjectsClient.find = createSoFindMock([]);
        context.savedObjectsClient.bulkUpdate = jest.fn();
        await manifestManager.bumpGlobalUnifiedManifestVersion();
        expect(context.savedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(0);
      });
    });
  });
});
