/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subject } from 'rxjs';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { LicenseService } from '../../../common/license';
import { createDefaultPolicy } from './create_default_policy';
import type { PolicyConfig } from '../../../common/endpoint/types';
import {
  policyFactory as policyConfigFactory,
  policyFactoryWithoutPaidFeatures as policyConfigFactoryWithoutPaidFeatures,
} from '../../../common/endpoint/models/policy_config';
import type {
  AnyPolicyCreateConfig,
  PolicyCreateCloudConfig,
  PolicyCreateEndpointConfig,
} from '../types';

describe('Create Default Policy tests ', () => {
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;

  const createDefaultPolicyCallback = (config: AnyPolicyCreateConfig | undefined): PolicyConfig => {
    return createDefaultPolicy(licenseService, config);
  };

  beforeEach(() => {
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
    licenseEmitter.next(Platinum); // set license level to platinum
  });
  describe('When no config is set', () => {
    it('Should return the Default Policy Config when license is at least platinum', () => {
      const policy = createDefaultPolicyCallback(undefined);
      expect(policy).toEqual(policyConfigFactory());
    });
    it('Should return the Default Policy Config without paid features when license is below platinum', () => {
      licenseEmitter.next(Gold);
      const policy = createDefaultPolicyCallback(undefined);
      expect(policy).toEqual(policyConfigFactoryWithoutPaidFeatures());
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

    it('Should return only process event enabled on policy when preset is NGAV', () => {
      const config = createEndpointConfig({ preset: 'NGAV' });
      const policy = createDefaultPolicyCallback(config);
      const events = defaultEventsDisabled();
      OSTypes.forEach((os) => {
        expect(policy[os].events).toMatchObject({
          ...events[os],
          process: true,
        });
      });
    });
    it('Should return process, file and network events enabled when preset is EDR Essential', () => {
      const config = createEndpointConfig({ preset: 'EDREssential' });
      const policy = createDefaultPolicyCallback(config);
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
    it('Should return the default config when preset is EDR Complete', () => {
      const config = createEndpointConfig({ preset: 'EDRComplete' });
      const policy = createDefaultPolicyCallback(config);
      const policyFactory = policyConfigFactory();
      expect(policy).toMatchObject(policyFactory);
    });
  });
  describe('When cloud config is set', () => {
    const createCloudConfig = (): PolicyCreateCloudConfig => ({
      type: 'cloud',
    });

    it('Session data should be enabled for Linux', () => {
      const config = createCloudConfig();
      const policy = createDefaultPolicyCallback(config);
      expect(policy.linux.events.session_data).toBe(true);
    });
    it('Protections should be disabled for all OSs', () => {
      const config = createCloudConfig();
      const policy = createDefaultPolicyCallback(config);
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
