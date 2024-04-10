/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { policyFactory } from '../models/policy_config';
import { AntivirusRegistrationModes, ProtectionModes, type PolicyConfig } from '../types';
import { updateAntivirusRegistrationEnabledInPlace } from './update_antivirus_registration_enabled';

describe('Update antivirus registration enabled', () => {
  let inputPolicyConfig: PolicyConfig;
  let expectedPolicyConfig: PolicyConfig;
  let input: PolicyConfig['windows']['antivirus_registration'];
  let expected: PolicyConfig['windows']['antivirus_registration'];

  beforeEach(() => {
    inputPolicyConfig = policyFactory();
    expectedPolicyConfig = policyFactory();

    input = inputPolicyConfig.windows.antivirus_registration;
    expected = expectedPolicyConfig.windows.antivirus_registration;
  });

  it('should update policy config in place', () => {
    input.mode = AntivirusRegistrationModes.enabled;
    input.enabled = false;

    updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

    expect(input.enabled).toBe(true);
  });

  it('should update only `antivirus_registration.enabled` field', () => {
    input.mode = AntivirusRegistrationModes.enabled;
    input.enabled = false;

    updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

    expected.mode = AntivirusRegistrationModes.enabled;
    expected.enabled = true;
    expect(inputPolicyConfig).toStrictEqual(expectedPolicyConfig);
  });

  it('should enable antivirus registration if `mode` is `enabled`', () => {
    input.mode = AntivirusRegistrationModes.enabled;
    input.enabled = false;

    updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

    expect(input.enabled).toBe(true);
  });

  it('should disable antivirus registration if `mode` is `disabled`', () => {
    input.mode = AntivirusRegistrationModes.disabled;
    input.enabled = true;

    updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

    expect(input.enabled).toBe(false);
  });

  describe('when mode is set to `sync_with_malware_prevention`', () => {
    it('should enable antivirus registration if malware is set to prevent', () => {
      input.mode = AntivirusRegistrationModes.sync;
      input.enabled = false;
      inputPolicyConfig.windows.malware.mode = ProtectionModes.prevent;

      updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

      expect(input.enabled).toBe(true);
    });

    it.each([ProtectionModes.detect, ProtectionModes.off])(
      'should disable antivirus registration if malware is set to %s',
      (malwareMode) => {
        input.mode = AntivirusRegistrationModes.sync;
        input.enabled = false;
        inputPolicyConfig.windows.malware.mode = malwareMode;

        updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

        expect(input.enabled).toBe(false);
      }
    );
  });

  it('should fallback to disabling antivirus registration if `mode` field contains unexpected value', () => {
    input.mode = 'unexpected value' as AntivirusRegistrationModes;
    input.enabled = true;
    inputPolicyConfig.windows.malware.mode = ProtectionModes.prevent;

    updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

    expect(input.enabled).toBe(false);
  });

  it('should fallback to disabling antivirus registration if `mode` field is missing', () => {
    input.enabled = true;
    delete (input as { mode?: string }).mode;
    inputPolicyConfig.windows.malware.mode = ProtectionModes.prevent;

    updateAntivirusRegistrationEnabledInPlace(inputPolicyConfig);

    expect(input.enabled).toBe(false);
  });
});
