/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyConfig } from '../types';
import { ProtectionModes } from '../types';
import { policyFactory } from './policy_config';
import { disableProtections } from './policy_config_helpers';

describe('Policy Config helpers', () => {
  describe('disableProtections', () => {
    it('disables all the protections in the default policy', () => {
      expect(disableProtections(policyFactory())).toEqual<PolicyConfig>(eventsOnlyPolicy);
    });

    it('does not enable supported fields', () => {
      const defaultPolicy: PolicyConfig = policyFactory();

      const notSupported: PolicyConfig['windows']['memory_protection'] = {
        mode: ProtectionModes.off,
        supported: false,
      };

      const inputPolicyWithoutSupportedProtections: PolicyConfig = {
        ...defaultPolicy,
        windows: {
          ...defaultPolicy.windows,
          memory_protection: notSupported,
          behavior_protection: notSupported,
          ransomware: notSupported,
        },
        mac: {
          ...defaultPolicy.mac,
          memory_protection: notSupported,
          behavior_protection: notSupported,
        },
        linux: {
          ...defaultPolicy.linux,
          memory_protection: notSupported,
          behavior_protection: notSupported,
        },
      };

      const expectedPolicyWithoutSupportedProtections: PolicyConfig = {
        ...eventsOnlyPolicy,
        windows: {
          ...eventsOnlyPolicy.windows,
          memory_protection: notSupported,
          behavior_protection: notSupported,
          ransomware: notSupported,
        },
        mac: {
          ...eventsOnlyPolicy.mac,
          memory_protection: notSupported,
          behavior_protection: notSupported,
        },
        linux: {
          ...eventsOnlyPolicy.linux,
          memory_protection: notSupported,
          behavior_protection: notSupported,
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
        ...eventsOnlyPolicy,
        windows: { ...eventsOnlyPolicy.windows, events: { ...windowsEvents } },
        mac: { ...eventsOnlyPolicy.mac, events: { ...macEvents } },
        linux: { ...eventsOnlyPolicy.linux, events: { ...linuxEvents } },
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
});

// This constant makes sure that if the type `PolicyConfig` is ever modified,
// the logic for disabling protections is also modified due to type check.
export const eventsOnlyPolicy: PolicyConfig = {
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
    malware: { mode: ProtectionModes.off, blocklist: false },
    ransomware: { mode: ProtectionModes.off, supported: true },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    behavior_protection: { mode: ProtectionModes.off, supported: true },
    popup: {
      malware: { message: '', enabled: false },
      ransomware: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
    },
    logging: { file: 'info' },
    antivirus_registration: { enabled: false },
    attack_surface_reduction: { credential_hardening: { enabled: false } },
  },
  mac: {
    events: { process: true, file: true, network: true },
    malware: { mode: ProtectionModes.off, blocklist: false },
    behavior_protection: { mode: ProtectionModes.off, supported: true },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    popup: {
      malware: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
    },
    logging: { file: 'info' },
  },
  linux: {
    events: {
      process: true,
      file: true,
      network: true,
      session_data: false,
      tty_io: false,
    },
    malware: { mode: ProtectionModes.off, blocklist: false },
    behavior_protection: { mode: ProtectionModes.off, supported: true },
    memory_protection: { mode: ProtectionModes.off, supported: true },
    popup: {
      malware: { message: '', enabled: false },
      behavior_protection: { message: '', enabled: false },
      memory_protection: { message: '', enabled: false },
    },
    logging: { file: 'info' },
  },
};
