/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import {
  createNewPackagePolicyMock,
  deletePackagePolicyMock,
} from '@kbn/fleet-plugin/common/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import {
  policyFactory,
  policyFactoryWithoutPaidFeatures,
} from '../../common/endpoint/models/policy_config';
import { buildManifestManagerMock } from '../endpoint/services/artifacts/manifest_manager/manifest_manager.mock';
import {
  getPackagePolicyCreateCallback,
  getPackagePolicyPostCreateCallback,
  getPackagePolicyDeleteCallback,
  getPackagePolicyUpdateCallback,
} from './fleet_integration';
import type { KibanaRequest } from '@kbn/core/server';
import { requestContextMock } from '../lib/detection_engine/routes/__mocks__';
import { requestContextFactoryMock } from '../request_context_factory.mock';
import type { EndpointAppContextServiceStartContract } from '../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContextServiceStartContract } from '../endpoint/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { LicenseService } from '../../common/license';
import { Subject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { EndpointDocGenerator } from '../../common/endpoint/generate_data';
import { ProtectionModes } from '../../common/endpoint/types';
import { getExceptionListClientMock } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client.mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { InternalArtifactCompleteSchema } from '../endpoint/schemas/artifacts';
import { ManifestManager } from '../endpoint/services/artifacts/manifest_manager';
import { getMockArtifacts, toArtifactRecords } from '../endpoint/lib/artifacts/mocks';
import { Manifest } from '../endpoint/lib/artifacts';
import type { NewPackagePolicy, PackagePolicy } from '@kbn/fleet-plugin/common/types/models';
import type { ManifestSchema } from '../../common/endpoint/schema/manifest';
import type { PostDeletePackagePoliciesResponse } from '@kbn/fleet-plugin/common';
import { createMockPolicyData } from '../endpoint/services/feature_usage/mocks';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../common/endpoint/service/artifacts/constants';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { disableProtections } from '../../common/endpoint/models/policy_config_helpers';
import type { AppFeatures } from '../lib/app_features';
import { createAppFeaturesMock } from '../lib/app_features/mocks';
import { ALL_APP_FEATURE_KEYS } from '../../common';

jest.mock('uuid', () => ({
  v4: (): string => 'NEW_UUID',
}));

describe('ingest_integration tests ', () => {
  let endpointAppContextMock: EndpointAppContextServiceStartContract;
  let req: KibanaRequest;
  let ctx: ReturnType<typeof requestContextMock.create>;
  const exceptionListClient: ExceptionListClient = getExceptionListClientMock();
  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;
  const Platinum = licenseMock.createLicense({
    license: { type: 'platinum', mode: 'platinum', uid: 'updated-uid' },
  });
  const Gold = licenseMock.createLicense({
    license: { type: 'gold', mode: 'gold', uid: 'updated-uid' },
  });
  const generator = new EndpointDocGenerator();
  const cloudService = cloudMock.createSetup();
  let appFeatures: AppFeatures;

  beforeEach(() => {
    endpointAppContextMock = createMockEndpointAppContextServiceStartContract();
    ctx = requestContextMock.createTools().context;
    req = httpServerMock.createKibanaRequest();
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
    appFeatures = endpointAppContextMock.appFeatures;

    jest
      .spyOn(endpointAppContextMock.endpointMetadataService, 'getFleetEndpointPackagePolicy')
      .mockResolvedValue(createMockPolicyData());
  });

  afterEach(() => {
    licenseService.stop();
    licenseEmitter.complete();
    jest.clearAllMocks();
  });

  describe('package policy init callback (atifacts manifest initialisation tests)', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const createNewEndpointPolicyInput = (
      manifest: ManifestSchema,
      license = 'platinum',
      cloud = cloudService.isCloudEnabled,
      licenseUuid = 'updated-uid',
      clusterUuid = '',
      clusterName = '',
      isServerlessEnabled = cloudService.isServerlessEnabled
    ) => ({
      type: 'endpoint',
      enabled: true,
      streams: [],
      config: {
        integration_config: {},
        policy: {
          value: disableProtections(
            policyFactory(
              license,
              cloud,
              licenseUuid,
              clusterUuid,
              clusterName,
              isServerlessEnabled
            )
          ),
        },
        artifact_manifest: { value: manifest },
      },
    });

    const invokeCallback = async (manifestManager: ManifestManager): Promise<NewPackagePolicy> => {
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const callback = getPackagePolicyCreateCallback(
        logger,
        manifestManager,
        requestContextFactoryMock.create(),
        endpointAppContextMock.alerting,
        licenseService,
        exceptionListClient,
        cloudService,
        appFeatures
      );

      return callback(
        createNewPackagePolicyMock(),
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
    };

    const TEST_POLICY_ID_1 = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';
    const TEST_POLICY_ID_2 = '93c46720-c217-11ea-9906-b5b8a21b268e';
    const ARTIFACT_NAME_EXCEPTIONS_MACOS = 'endpoint-exceptionlist-macos-v1';
    const ARTIFACT_NAME_TRUSTED_APPS_MACOS = 'endpoint-trustlist-macos-v1';
    const ARTIFACT_NAME_TRUSTED_APPS_WINDOWS = 'endpoint-trustlist-windows-v1';
    let ARTIFACT_EXCEPTIONS_MACOS: InternalArtifactCompleteSchema;
    let ARTIFACT_EXCEPTIONS_WINDOWS: InternalArtifactCompleteSchema;
    let ARTIFACT_TRUSTED_APPS_MACOS: InternalArtifactCompleteSchema;
    let ARTIFACT_TRUSTED_APPS_WINDOWS: InternalArtifactCompleteSchema;

    beforeAll(async () => {
      const artifacts = await getMockArtifacts();
      ARTIFACT_EXCEPTIONS_MACOS = artifacts[0];
      ARTIFACT_EXCEPTIONS_WINDOWS = artifacts[1];
      ARTIFACT_TRUSTED_APPS_MACOS = artifacts[3];
      ARTIFACT_TRUSTED_APPS_WINDOWS = artifacts[4];
    });

    beforeEach(() => {
      licenseEmitter.next(Platinum); // set license level to platinum
    });

    test('default manifest is taken when there is none and there are errors building new one', async () => {
      const manifestManager = buildManifestManagerMock();
      manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
      manifestManager.buildNewManifest = jest.fn().mockRejectedValue(new Error());

      expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
        createNewEndpointPolicyInput({
          artifacts: {},
          manifest_version: '1.0.0',
          schema_version: 'v1',
        })
      );

      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
      expect(manifestManager.pushArtifacts).not.toHaveBeenCalled();
      expect(manifestManager.commit).not.toHaveBeenCalled();
    });

    test('default manifest is taken when there is none and there are errors pushing artifacts', async () => {
      const newManifest = ManifestManager.createDefaultManifest();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      const manifestManager = buildManifestManagerMock();
      manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([new Error()]);

      expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
        createNewEndpointPolicyInput({
          artifacts: {},
          manifest_version: '1.0.0',
          schema_version: 'v1',
        })
      );

      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith(
        [ARTIFACT_EXCEPTIONS_MACOS],
        newManifest
      );
      expect(manifestManager.commit).not.toHaveBeenCalled();
    });

    test('default manifest is taken when there is none and there are errors commiting manifest', async () => {
      const newManifest = ManifestManager.createDefaultManifest();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);

      const manifestManager = buildManifestManagerMock();
      manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
      manifestManager.commit = jest.fn().mockRejectedValue(new Error());

      expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
        createNewEndpointPolicyInput({
          artifacts: {},
          manifest_version: '1.0.0',
          schema_version: 'v1',
        })
      );

      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith(
        [ARTIFACT_EXCEPTIONS_MACOS],
        newManifest
      );
      expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
    });

    test('manifest is created successfuly when there is none', async () => {
      const newManifest = ManifestManager.createDefaultManifest();
      newManifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      newManifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS);

      const manifestManager = buildManifestManagerMock();
      manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(null);
      manifestManager.buildNewManifest = jest.fn().mockResolvedValue(newManifest);
      manifestManager.pushArtifacts = jest.fn().mockResolvedValue([]);
      manifestManager.commit = jest.fn().mockResolvedValue(null);

      expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
        createNewEndpointPolicyInput({
          artifacts: toArtifactRecords({
            [ARTIFACT_NAME_EXCEPTIONS_MACOS]: ARTIFACT_EXCEPTIONS_MACOS,
            [ARTIFACT_NAME_TRUSTED_APPS_MACOS]: ARTIFACT_TRUSTED_APPS_MACOS,
          }),
          manifest_version: '1.0.0',
          schema_version: 'v1',
        })
      );

      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
      expect(manifestManager.pushArtifacts).toHaveBeenCalledWith(
        [ARTIFACT_EXCEPTIONS_MACOS, ARTIFACT_TRUSTED_APPS_MACOS],
        newManifest
      );
      expect(manifestManager.commit).toHaveBeenCalledWith(newManifest);
    });

    test('policy is updated with only default entries from manifest', async () => {
      const manifest = new Manifest({ soVersion: '1.0.1', semanticVersion: '1.0.1' });
      manifest.addEntry(ARTIFACT_EXCEPTIONS_MACOS);
      manifest.addEntry(ARTIFACT_EXCEPTIONS_WINDOWS, TEST_POLICY_ID_1);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_MACOS, TEST_POLICY_ID_2);
      manifest.addEntry(ARTIFACT_TRUSTED_APPS_WINDOWS);

      const manifestManager = buildManifestManagerMock();
      manifestManager.getLastComputedManifest = jest.fn().mockResolvedValue(manifest);

      expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
        createNewEndpointPolicyInput({
          artifacts: toArtifactRecords({
            [ARTIFACT_NAME_EXCEPTIONS_MACOS]: ARTIFACT_EXCEPTIONS_MACOS,
            [ARTIFACT_NAME_TRUSTED_APPS_WINDOWS]: ARTIFACT_TRUSTED_APPS_WINDOWS,
          }),
          manifest_version: '1.0.1',
          schema_version: 'v1',
        })
      );

      expect(manifestManager.buildNewManifest).not.toHaveBeenCalled();
      expect(manifestManager.pushArtifacts).not.toHaveBeenCalled();
      expect(manifestManager.commit).not.toHaveBeenCalled();
    });
  });

  describe('package policy post create callback', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const logger = loggingSystemMock.create().get('ingest_integration.test');
    const callback = getPackagePolicyPostCreateCallback(logger, exceptionListClient);
    const policyConfig = generator.generatePolicyPackagePolicy() as PackagePolicy;

    it('should create the Endpoint Event Filters List and add the correct Event Filters List Item attached to the policy given nonInteractiveSession parameter on integration config eventFilters', async () => {
      const integrationConfig = {
        type: 'cloud',
        eventFilters: {
          nonInteractiveSession: true,
        },
      };

      policyConfig.inputs[0]!.config!.integration_config = {
        value: integrationConfig,
      };
      const postCreatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );

      expect(await exceptionListClient.createExceptionList).toHaveBeenCalledWith(
        expect.objectContaining({ listId: ENDPOINT_EVENT_FILTERS_LIST_ID })
      );

      expect(await exceptionListClient.createExceptionListItem).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: ENDPOINT_EVENT_FILTERS_LIST_ID,
          tags: [`policy:${postCreatedPolicyConfig.id}`],
          osTypes: ['linux'],
          entries: [
            {
              field: 'process.entry_leader.interactive',
              operator: 'included',
              type: 'match',
              value: 'false',
            },
          ],
          itemId: 'NEW_UUID',
          namespaceType: 'agnostic',
        })
      );
    });

    it('should not call Event Filters List and Event Filters List Item if nonInteractiveSession parameter is not present on integration config eventFilters', async () => {
      const integrationConfig = {
        type: 'cloud',
      };

      policyConfig.inputs[0]!.config!.integration_config = {
        value: integrationConfig,
      };
      const postCreatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );

      expect(await exceptionListClient.createExceptionList).not.toHaveBeenCalled();

      expect(await exceptionListClient.createExceptionListItem).not.toHaveBeenCalled();

      expect(postCreatedPolicyConfig.inputs[0]!.config!.integration_config.value).toEqual(
        integrationConfig
      );
    });
  });

  describe('package policy update callback (when the license is below platinum)', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    beforeEach(() => {
      licenseEmitter.next(Gold); // set license level to gold
    });
    it('returns an error if paid features are turned on in the policy', async () => {
      const mockPolicy = policyFactory(); // defaults with paid features on
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const callback = getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        endpointAppContextMock.featureUsageService,
        endpointAppContextMock.endpointMetadataService,
        cloudService,
        esClient,
        appFeatures
      );
      const policyConfig = generator.generatePolicyPackagePolicy();
      policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
      await expect(() =>
        callback(policyConfig, soClient, esClient, requestContextMock.convertContext(ctx), req)
      ).rejects.toThrow('Requires Platinum license');
    });
    it('updates successfully if no paid features are turned on in the policy', async () => {
      const mockPolicy = policyFactoryWithoutPaidFeatures();
      mockPolicy.windows.malware.mode = ProtectionModes.detect;
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const callback = getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        endpointAppContextMock.featureUsageService,
        endpointAppContextMock.endpointMetadataService,
        cloudService,
        esClient,
        appFeatures
      );
      const policyConfig = generator.generatePolicyPackagePolicy();
      policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
      const updatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
    });
  });

  describe('package policy update callback (when the license is at least platinum)', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    beforeEach(() => {
      licenseEmitter.next(Platinum); // set license level to platinum
    });

    it('updates successfully when paid features are turned on', async () => {
      const mockPolicy = policyFactory();
      mockPolicy.windows.popup.malware.message = 'paid feature';
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const callback = getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        endpointAppContextMock.featureUsageService,
        endpointAppContextMock.endpointMetadataService,
        cloudService,
        esClient,
        appFeatures
      );
      const policyConfig = generator.generatePolicyPackagePolicy();
      policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
      const updatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
    });

    it('should turn off protections if endpointPolicyProtections appFeature is disabled', async () => {
      appFeatures = createAppFeaturesMock(
        ALL_APP_FEATURE_KEYS.filter((key) => key !== 'endpoint_policy_protections')
      );
      const callback = getPackagePolicyUpdateCallback(
        endpointAppContextMock.logger,
        licenseService,
        endpointAppContextMock.featureUsageService,
        endpointAppContextMock.endpointMetadataService,
        cloudService,
        esClient,
        appFeatures
      );

      const updatedPolicy = await callback(
        generator.generatePolicyPackagePolicy(),
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );

      expect(updatedPolicy.inputs?.[0]?.config?.policy.value).toMatchObject({
        linux: {
          behavior_protection: { mode: 'off' },
          malware: { mode: 'off' },
          memory_protection: { mode: 'off' },
        },
        mac: {
          behavior_protection: { mode: 'off' },
          malware: { mode: 'off' },
          memory_protection: { mode: 'off' },
        },
        windows: {
          antivirus_registration: { enabled: false },
          attack_surface_reduction: { credential_hardening: { enabled: false } },
          behavior_protection: { mode: 'off' },
          malware: { blocklist: false },
          memory_protection: { mode: 'off' },
          ransomware: { mode: 'off' },
        },
      });
    });
  });

  describe('package policy update callback when meta fields should be updated', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const infoResponse = {
      cluster_name: 'updated-name',
      cluster_uuid: 'updated-uuid',
      license_uid: 'updated-uid',
      name: 'name',
      tagline: 'tagline',
      version: {
        number: '1.2.3',
        lucene_version: '1.2.3',
        build_date: 'DateString',
        build_flavor: 'string',
        build_hash: 'string',
        build_snapshot: true,
        build_type: 'string',
        minimum_index_compatibility_version: '1.2.3',
        minimum_wire_compatibility_version: '1.2.3',
      },
    };

    esClient.info.mockResolvedValue(infoResponse);

    beforeEach(() => {
      licenseEmitter.next(Platinum); // set license level to platinum
    });

    it('updates successfully when meta fields differ from services', async () => {
      const mockPolicy = policyFactory();
      mockPolicy.meta.cloud = true; // cloud mock will return true
      mockPolicy.meta.license = 'platinum'; // license is set to emit platinum
      mockPolicy.meta.cluster_name = 'updated-name';
      mockPolicy.meta.cluster_uuid = 'updated-uuid';
      mockPolicy.meta.license_uid = 'updated-uid';
      mockPolicy.meta.serverless = false;
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const callback = getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        endpointAppContextMock.featureUsageService,
        endpointAppContextMock.endpointMetadataService,
        cloudService,
        esClient,
        appFeatures
      );
      const policyConfig = generator.generatePolicyPackagePolicy();

      // values should be updated
      policyConfig.inputs[0]!.config!.policy.value.meta.cloud = false;
      policyConfig.inputs[0]!.config!.policy.value.meta.license = 'gold';
      policyConfig.inputs[0]!.config!.policy.value.meta.cluster_name = 'original-name';
      policyConfig.inputs[0]!.config!.policy.value.meta.cluster_uuid = 'original-uuid';
      policyConfig.inputs[0]!.config!.policy.value.meta.license_uid = 'original-uid';
      policyConfig.inputs[0]!.config!.policy.value.meta.serverless = true;
      const updatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
    });

    it('meta fields stay the same where there is no difference', async () => {
      const mockPolicy = policyFactory();
      mockPolicy.meta.cloud = true; // cloud mock will return true
      mockPolicy.meta.license = 'platinum'; // license is set to emit platinum
      mockPolicy.meta.cluster_name = 'updated-name';
      mockPolicy.meta.cluster_uuid = 'updated-uuid';
      mockPolicy.meta.license_uid = 'updated-uid';
      mockPolicy.meta.serverless = false;
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const callback = getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        endpointAppContextMock.featureUsageService,
        endpointAppContextMock.endpointMetadataService,
        cloudService,
        esClient,
        appFeatures
      );
      const policyConfig = generator.generatePolicyPackagePolicy();
      // values should be updated
      policyConfig.inputs[0]!.config!.policy.value.meta.cloud = true;
      policyConfig.inputs[0]!.config!.policy.value.meta.license = 'platinum';
      policyConfig.inputs[0]!.config!.policy.value.meta.cluster_name = 'updated-name';
      policyConfig.inputs[0]!.config!.policy.value.meta.cluster_uuid = 'updated-uuid';
      policyConfig.inputs[0]!.config!.policy.value.meta.license_uid = 'updated-uid';
      policyConfig.inputs[0]!.config!.policy.value.meta.serverless = false;
      const updatedPolicyConfig = await callback(
        policyConfig,
        soClient,
        esClient,
        requestContextMock.convertContext(ctx),
        req
      );
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
    });
  });

  describe('package policy delete callback', () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    const invokeDeleteCallback = async (): Promise<void> => {
      const callback = getPackagePolicyDeleteCallback(exceptionListClient);
      await callback(deletePackagePolicyMock(), soClient, esClient);
    };

    let removedPolicies: PostDeletePackagePoliciesResponse;
    let policyId: string;
    let fakeArtifact: ExceptionListSchema;

    beforeEach(() => {
      removedPolicies = deletePackagePolicyMock();
      policyId = removedPolicies[0].id;
      fakeArtifact = {
        ...getExceptionListSchemaMock(),
        tags: [`policy:${policyId}`],
      };

      exceptionListClient.findExceptionListsItem = jest
        .fn()
        .mockResolvedValueOnce({ data: [fakeArtifact], total: 1 });
      exceptionListClient.updateExceptionListItem = jest
        .fn()
        .mockResolvedValueOnce({ ...fakeArtifact, tags: [] });
    });

    it('removes policy from artifact', async () => {
      await invokeDeleteCallback();

      expect(exceptionListClient.findExceptionListsItem).toHaveBeenCalledWith({
        listId: ALL_ENDPOINT_ARTIFACT_LIST_IDS,
        filter: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(
          () => `exception-list-agnostic.attributes.tags:"policy:${policyId}"`
        ),
        namespaceType: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(() => 'agnostic'),
        page: 1,
        perPage: 50,
        sortField: undefined,
        sortOrder: undefined,
      });

      expect(exceptionListClient.updateExceptionListItem).toHaveBeenCalledWith({
        ...fakeArtifact,
        namespaceType: fakeArtifact.namespace_type,
        osTypes: fakeArtifact.os_types,
        tags: [],
      });
    });
  });
});
