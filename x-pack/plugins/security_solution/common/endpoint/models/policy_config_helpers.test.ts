/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig } from '../types';
import { PolicyOperatingSystem, ProtectionModes, AntivirusRegistrationModes } from '../types';
import { policyFactory } from './policy_config';
import {
  disableProtections,
  isPolicySetToEventCollectionOnly,
  ensureOnlyEventCollectionIsAllowed,
  isBillablePolicy,
  getPolicyProtectionsReference,
} from './policy_config_helpers';
import { set } from 'lodash';

describe('Policy Config helpers', () => {
  describe('disableProtections', () => {
    it('disables all the protections in the default policy', () => {
      expect(disableProtections(policyFactory())).toEqual<PolicyConfig>(eventsOnlyPolicy());
    });

    it('does not enable supported fields', () => {
      const defaultPolicy: PolicyConfig = policyFactory();

      const notSupported: PolicyConfig['windows']['memory_protection'] = {
        mode: ProtectionModes.off,
        supported: false,
      };

      const notSupportedBehaviorProtection: PolicyConfig['windows']['behavior_protection'] = {
        mode: ProtectionModes.off,
        supported: false,
        reputation_service: false,
      };

      const inputPolicyWithoutSupportedProtections: PolicyConfig = {
        ...defaultPolicy,
        windows: {
          ...defaultPolicy.windows,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
          ransomware: notSupported,
        },
        mac: {
          ...defaultPolicy.mac,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
        linux: {
          ...defaultPolicy.linux,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
      };

      const expectedPolicyWithoutSupportedProtections: PolicyConfig = {
        ...eventsOnlyPolicy(),
        windows: {
          ...eventsOnlyPolicy().windows,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
          ransomware: notSupported,
        },
        mac: {
          ...eventsOnlyPolicy().mac,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
        linux: {
          ...eventsOnlyPolicy().linux,
          memory_protection: notSupported,
          behavior_protection: notSupportedBehaviorProtection,
        },
      };

      const policy = disableProtections(inputPolicyWithoutSupportedProtections);

      expect(policy).toEqual<PolicyConfig>(expectedPolicyWithoutSupportedProtections);
    });

    it('does not enable events', () => {
      const defaultPolicy: PolicyConfig = policyFactory();

      const windowsEvents: typeof defaultPolicy.windows.events = {
        credential_access: false,
        dll_and_driver_load: false,
        dns: false,
        file: false,
        network: false,
        process: false,
        registry: false,
        security: false,
      };

      const macEvents: typeof defaultPolicy.mac.events = {
        file: false,
        process: false,
        network: false,
      };

      const linuxEvents: typeof defaultPolicy.linux.events = {
        file: false,
        process: false,
        network: false,
        session_data: false,
        tty_io: false,
      };

      const expectedPolicy: PolicyConfig = {
        ...eventsOnlyPolicy(),
        windows: { ...eventsOnlyPolicy().windows, events: { ...windowsEvents } },
        mac: { ...eventsOnlyPolicy().mac, events: { ...macEvents } },
        linux: { ...eventsOnlyPolicy().linux, events: { ...linuxEvents } },
      };

      const inputPolicy = {
        ...defaultPolicy,
        windows: { ...defaultPolicy.windows, events: { ...windowsEvents } },
        mac: { ...defaultPolicy.mac, events: { ...macEvents } },
        linux: { ...defaultPolicy.linux, events: { ...linuxEvents } },
      };

      expect(disableProtections(inputPolicy)).toEqual<PolicyConfig>(expectedPolicy);
    });
  });

  describe('setPolicyToEventCollectionOnly()', () => {
    it('should set the policy to event collection only', () => {
      const policyConfig = policyFactory();
      policyConfig.windows.antivirus_registration = {
        enabled: true,
        mode: AntivirusRegistrationModes.enabled,
      };
      expect(ensureOnlyEventCollectionIsAllowed(policyConfig)).toEqual(eventsOnlyPolicy());
    });
  });

  describe('isPolicySetToEventCollectionOnly', () => {
    let policy: PolicyConfig;

    beforeEach(() => {
      policy = ensureOnlyEventCollectionIsAllowed(policyFactory());
    });

    it.each([
      {
        keyPath: `${PolicyOperatingSystem.windows}.malware.mode`,
        keyValue: ProtectionModes.prevent,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.mac}.malware.mode`,
        keyValue: ProtectionModes.off,
        expectedResult: true,
      },
      {
        keyPath: `${PolicyOperatingSystem.windows}.ransomware.mode`,
        keyValue: ProtectionModes.prevent,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.linux}.memory_protection.mode`,
        keyValue: ProtectionModes.off,
        expectedResult: true,
      },
      {
        keyPath: `${PolicyOperatingSystem.mac}.behavior_protection.mode`,
        keyValue: ProtectionModes.detect,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.windows}.attack_surface_reduction.credential_hardening.enabled`,
        keyValue: true,
        expectedResult: false,
      },
      {
        keyPath: `${PolicyOperatingSystem.windows}.antivirus_registration.enabled`,
        keyValue: true,
        expectedResult: false,
      },
    ])(
      'should return `$expectedResult` if `$keyPath` is set to `$keyValue`',
      ({ keyPath, keyValue, expectedResult }) => {
        set(policy, keyPath, keyValue);

        expect(isPolicySetToEventCollectionOnly(policy)).toEqual({
          isOnlyCollectingEvents: expectedResult,
          message: expectedResult ? undefined : `property [${keyPath}] is set to [${keyValue}]`,
        });
      }
    );
  });

  describe('isBillablePolicy', () => {
    it('doesnt bill if serverless false', () => {
      const policy = policyFactory();
      const isBillable = isBillablePolicy(policy);
      expect(policy.meta.serverless).toBe(false);
      expect(isBillable).toBe(false);
    });

    it('doesnt bill if event collection only', () => {
      const policy = ensureOnlyEventCollectionIsAllowed(policyFactory());
      policy.meta.serverless = true;
      const isBillable = isBillablePolicy(policy);
      expect(isBillable).toBe(false);
    });

    it.each(getPolicyProtectionsReference())(
      'correctly bills if $keyPath is enabled',
      (feature) => {
        for (const os of feature.osList) {
          const policy = ensureOnlyEventCollectionIsAllowed(policyFactory());
          policy.meta.serverless = true;
          set(policy, `${os}.${feature.keyPath}`, feature.enableValue);
          const isBillable = isBillablePolicy(policy);
          expect(isBillable).toBe(true);
        }
      }
    );
  });
});

// This constant makes sure that if the type `PolicyConfig` is ever modified,
// the logic for disabling protections is also modified due to type check.
export const eventsOnlyPolicy = (): PolicyConfig => ({
  global_manifest_version: 'latest',
  meta: {
    license: '',
    cloud: false,
    license_uuid: '',
    cluster_name: '',
    cluster_uuid: '',
    serverless: false,
    billable: false,
  },
  windows: {
    events: {
      credential_access: true,
      dll_and_driver_load: true,
      dns: true,
      file: true,
      network: true,
      process: true,
      registry: true,
      security: true,
    },
    malware: { mode: ProtectionModes.off, blocklist: false, on_write_scan: false },
    ransomware: { mode: ProtectionModes.off, supported: true },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    behavior_protection: { mode: ProtectionModes.off, supported: true, reputation_service: false },
    popup: {
      malware: { message: '', enabled: false },
      ransomware: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
    },
    logging: { file: 'info' },
    antivirus_registration: { enabled: false, mode: AntivirusRegistrationModes.disabled },
    attack_surface_reduction: { credential_hardening: { enabled: false } },
  },
  mac: {
    events: { process: true, file: true, network: true },
    malware: { mode: ProtectionModes.off, blocklist: false, on_write_scan: false },
    behavior_protection: { mode: ProtectionModes.off, supported: true, reputation_service: false },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    popup: {
      malware: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
    },
    logging: { file: 'info' },
    advanced: {
      capture_env_vars: 'DYLD_INSERT_LIBRARIES,DYLD_FRAMEWORK_PATH,DYLD_LIBRARY_PATH,LD_PRELOAD',
    },
  },
  linux: {
    events: {
      process: true,
      file: true,
      network: true,
      session_data: false,
      tty_io: false,
    },
    malware: { mode: ProtectionModes.off, blocklist: false, on_write_scan: false },
    behavior_protection: { mode: ProtectionModes.off, supported: true, reputation_service: false },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    popup: {
      malware: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
    },
    logging: { file: 'info' },
    advanced: {
      capture_env_vars: 'LD_PRELOAD,LD_LIBRARY_PATH',
    },
  },
});
