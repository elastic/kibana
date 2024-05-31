/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { ALL_PRODUCT_FEATURE_KEYS } from '@kbn/security-solution-features/keys';
import { LicenseService } from '../../../common/license';
import { createDefaultPolicy } from './create_default_policy';
import { ProtectionModes } from '../../../common/endpoint/types';
import type { PolicyConfig } from '../../../common/endpoint/types';
import { policyFactory } from '../../../common/endpoint/models/policy_config';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type {
  AnyPolicyCreateConfig,
  PolicyCreateCloudConfig,
  PolicyCreateEndpointConfig,
} from '../types';
import type { ProductFeaturesService } from '../../lib/product_features_service/product_features_service';
import { createProductFeaturesServiceMock } from '../../lib/product_features_service/mocks';

describe('Create Default Policy tests ', () => {
  const cloud = cloudMock.createSetup();
  const Platinum = licenseMock.createLicense({
    license: { type: 'platinum', mode: 'platinum', uid: '' },
  });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold', uid: '' } });
  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;
  let productFeaturesService: ProductFeaturesService;

  const createDefaultPolicyCallback = async (
    config: AnyPolicyCreateConfig | undefined
  ): Promise<PolicyConfig> => {
    const esClientInfo = await elasticsearchServiceMock.createClusterClient().asInternalUser.info();
    esClientInfo.cluster_name = '';
    esClientInfo.cluster_uuid = '';
    return createDefaultPolicy(licenseService, config, cloud, esClientInfo, productFeaturesService);
  };

  beforeEach(() => {
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
    licenseEmitter.next(Platinum); // set license level to platinum
    productFeaturesService = createProductFeaturesServiceMock();
  });

  describe('When no config is set', () => {
    it('Should return PolicyConfig for events only when license is at least platinum', async () => {
      const defaultPolicy = policyFactory();

      const policy = await createDefaultPolicyCallback(undefined);

      // events are the same
      expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
      expect(policy.linux.events).toEqual(defaultPolicy.linux.events);
      expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

      // check some of the protections to be disabled
      const disabledButSupported = { mode: ProtectionModes.off, supported: true };
      const disabledButSupportedBehaviorProtection = {
        mode: ProtectionModes.off,
        supported: true,
        reputation_service: true,
      };
      expect(policy.windows.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);
      expect(policy.mac.memory_protection).toEqual(disabledButSupported);
      expect(policy.linux.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);

      // malware popups should be disabled
      expect(policy.windows.popup.malware.enabled).toBeFalsy();
      expect(policy.mac.popup.malware.enabled).toBeFalsy();
      expect(policy.linux.popup.malware.enabled).toBeFalsy();
    });

    it('Should return PolicyConfig for events only without paid features when license is below platinum', async () => {
      const defaultPolicy = policyFactory();
      licenseEmitter.next(Gold);

      const policy = await createDefaultPolicyCallback(undefined);

      // events are the same
      expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
      expect(policy.linux.events).toEqual(defaultPolicy.linux.events);
      expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

      // check some of the protections to be disabled and unsupported
      const disabledAndUnsupported = { mode: ProtectionModes.off, supported: false };
      const disabledAndUnsupportedBehaviorProtection = {
        mode: ProtectionModes.off,
        supported: false,
        reputation_service: false,
      };
      expect(policy.windows.behavior_protection).toEqual(disabledAndUnsupportedBehaviorProtection);
      expect(policy.mac.memory_protection).toEqual(disabledAndUnsupported);
      expect(policy.linux.behavior_protection).toEqual(disabledAndUnsupportedBehaviorProtection);

      // malware popups are enabled on unpaid license
      expect(policy.windows.popup.malware.enabled).toBeTruthy();
      expect(policy.mac.popup.malware.enabled).toBeTruthy();
      expect(policy.linux.popup.malware.enabled).toBeTruthy();
    });
  });

  describe('When endpoint config is set', () => {
    const createEndpointConfig = (
      endpointConfig: PolicyCreateEndpointConfig['endpointConfig']
    ): PolicyCreateEndpointConfig => {
      return {
        type: 'endpoint',
        endpointConfig,
      };
    };

    const defaultEventsDisabled = () => ({
      linux: {
        process: false,
        file: false,
        network: false,
        session_data: false,
        tty_io: false,
      },
      mac: {
        process: false,
        file: false,
        network: false,
      },
      windows: {
        process: false,
        file: false,
        network: false,
        dll_and_driver_load: false,
        dns: false,
        registry: false,
        security: false,
      },
    });
    const OSTypes = ['linux', 'mac', 'windows'] as const;

    it('Should return PolicyConfig for events only when preset is DataCollection', async () => {
      const defaultPolicy = policyFactory();
      const config = createEndpointConfig({ preset: 'DataCollection' });
      const policy = await createDefaultPolicyCallback(config);

      // events are the same
      expect(policy.windows.events).toEqual(defaultPolicy.windows.events);
      expect(policy.linux.events).toEqual(defaultPolicy.linux.events);
      expect(policy.mac.events).toEqual(defaultPolicy.mac.events);

      // check some of the protections to be disabled
      const disabledButSupported = { mode: ProtectionModes.off, supported: true };
      const disabledButSupportedBehaviorProtection = {
        mode: ProtectionModes.off,
        supported: true,
        reputation_service: true,
      };
      expect(policy.windows.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);
      expect(policy.mac.memory_protection).toEqual(disabledButSupported);
      expect(policy.linux.behavior_protection).toEqual(disabledButSupportedBehaviorProtection);

      // malware popups should be disabled
      expect(policy.windows.popup.malware.enabled).toBeFalsy();
      expect(policy.mac.popup.malware.enabled).toBeFalsy();
      expect(policy.linux.popup.malware.enabled).toBeFalsy();
    });

    it('Should return only process event enabled on policy when preset is NGAV', async () => {
      const config = createEndpointConfig({ preset: 'NGAV' });
      const policy = await createDefaultPolicyCallback(config);
      const events = defaultEventsDisabled();
      OSTypes.forEach((os) => {
        expect(policy[os].events).toMatchObject({
          ...events[os],
          process: true,
        });
      });
    });

    it('Should return process, file and network events enabled when preset is EDR Essential', async () => {
      const config = createEndpointConfig({ preset: 'EDREssential' });
      const policy = await createDefaultPolicyCallback(config);
      const events = defaultEventsDisabled();
      const enabledEvents = {
        process: true,
        file: true,
        network: true,
      };
      OSTypes.forEach((os) => {
        expect(policy[os].events).toMatchObject({
          ...events[os],
          ...enabledEvents,
        });
      });
    });

    it('Should return the default config when preset is EDR Complete', async () => {
      const config = createEndpointConfig({ preset: 'EDRComplete' });
      const policy = await createDefaultPolicyCallback(config);
      const licenseType = 'platinum';
      const isCloud = true;
      const defaultPolicy = policyFactory(licenseType, isCloud);
      // update defaultPolicy w/ platinum license & cloud info
      defaultPolicy.meta.license = licenseType;
      defaultPolicy.meta.cloud = isCloud;
      expect(policy).toMatchObject(defaultPolicy);
    });

    it('should set policy to event collection only if endpointPolicyProtections productFeature is disabled', async () => {
      productFeaturesService = createProductFeaturesServiceMock(
        ALL_PRODUCT_FEATURE_KEYS.filter((key) => key !== 'endpoint_policy_protections')
      );

      await expect(
        createDefaultPolicyCallback(createEndpointConfig({ preset: 'EDRComplete' }))
      ).resolves.toMatchObject({
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

  describe('When cloud config is set', () => {
    const createCloudConfig = (): PolicyCreateCloudConfig => ({
      type: 'cloud',
    });

    it('Session data should be enabled for Linux', async () => {
      const config = createCloudConfig();
      const policy = await createDefaultPolicyCallback(config);
      expect(policy.linux.events.session_data).toBe(true);
    });
    it('Protections should be disabled for all OSs', async () => {
      const config = createCloudConfig();
      const policy = await createDefaultPolicyCallback(config);
      const OSTypes = ['linux', 'mac', 'windows'] as const;
      OSTypes.forEach((os) => {
        expect(policy[os].malware.mode).toBe('off');
        expect(policy[os].memory_protection.mode).toBe('off');
        expect(policy[os].behavior_protection.mode).toBe('off');
      });
      // Ransomware is windows only
      expect(policy.windows.ransomware.mode).toBe('off');
    });
  });
});
