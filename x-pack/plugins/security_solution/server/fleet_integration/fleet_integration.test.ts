/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { httpServerMock, loggingSystemMock } from 'src/core/server/mocks';
import { createNewPackagePolicyMock, deletePackagePolicyMock } from '../../../fleet/common/mocks';
import {
  policyFactory,
  policyFactoryWithoutPaidFeatures,
} from '../../common/endpoint/models/policy_config';
import { buildManifestManagerMock } from '../endpoint/services/artifacts/manifest_manager/manifest_manager.mock';
import {
  getPackagePolicyCreateCallback,
  getPackagePolicyDeleteCallback,
  getPackagePolicyUpdateCallback,
} from './fleet_integration';
import { KibanaRequest } from 'kibana/server';
import { requestContextMock } from '../lib/detection_engine/routes/__mocks__';
import { requestContextFactoryMock } from '../request_context_factory.mock';
import { EndpointAppContextServiceStartContract } from '../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContextServiceStartContract } from '../endpoint/mocks';
import { licenseMock } from '../../../licensing/common/licensing.mock';
import { LicenseService } from '../../common/license';
import { Subject } from 'rxjs';
import { ILicense } from '../../../licensing/common/types';
import { EndpointDocGenerator } from '../../common/endpoint/generate_data';
import { ProtectionModes } from '../../common/endpoint/types';
import type { SecuritySolutionRequestHandlerContext } from '../types';
import { getExceptionListClientMock } from '../../../lists/server/services/exception_lists/exception_list_client.mock';
import { getExceptionListSchemaMock } from '../../../lists/common/schemas/response/exception_list_schema.mock';
import { ExceptionListClient } from '../../../lists/server';
import { InternalArtifactCompleteSchema } from '../endpoint/schemas/artifacts';
import { ManifestManager } from '../endpoint/services/artifacts/manifest_manager';
import { getMockArtifacts, toArtifactRecords } from '../endpoint/lib/artifacts/mocks';
import { Manifest } from '../endpoint/lib/artifacts';
import { NewPackagePolicy } from '../../../fleet/common/types/models';
import { ManifestSchema } from '../../common/endpoint/schema/manifest';
import { DeletePackagePoliciesResponse } from '../../../fleet/common';
import { createMockPolicyData } from '../endpoint/services/feature_usage';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../common/endpoint/service/artifacts/constants';

describe('ingest_integration tests ', () => {
  let endpointAppContextMock: EndpointAppContextServiceStartContract;
  let req: KibanaRequest;
  let ctx: SecuritySolutionRequestHandlerContext;
  const exceptionListClient: ExceptionListClient = getExceptionListClientMock();
  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
  const generator = new EndpointDocGenerator();

  beforeEach(() => {
    endpointAppContextMock = createMockEndpointAppContextServiceStartContract();
    ctx = requestContextMock.createTools().context;
    req = httpServerMock.createKibanaRequest();
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);

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
    const createNewEndpointPolicyInput = (manifest: ManifestSchema) => ({
      type: 'endpoint',
      enabled: true,
      streams: [],
      config: {
        policy: { value: policyFactory() },
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
        exceptionListClient
      );

      return callback(createNewPackagePolicyMock(), ctx, req);
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

  describe('package policy update callback (when the license is below platinum)', () => {
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
        endpointAppContextMock.endpointMetadataService
      );
      const policyConfig = generator.generatePolicyPackagePolicy();
      policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
      await expect(() => callback(policyConfig, ctx, req)).rejects.toThrow(
        'Requires Platinum license'
      );
    });
    it('updates successfully if no paid features are turned on in the policy', async () => {
      const mockPolicy = policyFactoryWithoutPaidFeatures();
      mockPolicy.windows.malware.mode = ProtectionModes.detect;
      const logger = loggingSystemMock.create().get('ingest_integration.test');
      const callback = getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        endpointAppContextMock.featureUsageService,
        endpointAppContextMock.endpointMetadataService
      );
      const policyConfig = generator.generatePolicyPackagePolicy();
      policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
      const updatedPolicyConfig = await callback(policyConfig, ctx, req);
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
    });
  });

  describe('package policy update callback (when the license is at least platinum)', () => {
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
        endpointAppContextMock.endpointMetadataService
      );
      const policyConfig = generator.generatePolicyPackagePolicy();
      policyConfig.inputs[0]!.config!.policy.value = mockPolicy;
      const updatedPolicyConfig = await callback(policyConfig, ctx, req);
      expect(updatedPolicyConfig.inputs[0]!.config!.policy.value).toEqual(mockPolicy);
    });
  });

  describe('package policy delete callback', () => {
    const invokeDeleteCallback = async (): Promise<void> => {
      const callback = getPackagePolicyDeleteCallback(exceptionListClient);
      await callback(deletePackagePolicyMock());
    };

    let removedPolicies: DeletePackagePoliciesResponse;
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
