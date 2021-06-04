/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isEndpointPolicyValidForLicense,
  unsetPolicyFeaturesAccordingToLicenseLevel,
} from './policy_config';
import {
  DefaultPolicyNotificationMessage,
  policyFactory,
  policyFactoryWithSupportedFeatures,
  policyFactoryWithoutPaidFeatures,
} from '../endpoint/models/policy_config';
import { licenseMock } from '../../../licensing/common/licensing.mock';
import { ProtectionModes } from '../endpoint/types';

describe('policy_config and licenses', () => {
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
  const Basic = licenseMock.createLicense({ license: { type: 'basic', mode: 'basic' } });

  describe('isEndpointPolicyValidForLicense', () => {
    it('allows malware notification to be disabled with a Platinum license', () => {
      const policy = policyFactory();
      policy.windows.popup.malware.enabled = false; // make policy change
      const valid = isEndpointPolicyValidForLicense(policy, Platinum);
      expect(valid).toBeTruthy();
    });
    it('blocks windows malware notification changes below Platinum licenses', () => {
      const policy = policyFactory();
      policy.windows.popup.malware.enabled = false; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, Gold);
      expect(valid).toBeFalsy();

      valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeFalsy();
    });

    it('blocks mac malware notification changes below Platinum licenses', () => {
      const policy = policyFactory();
      policy.mac.popup.malware.enabled = false; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, Gold);
      expect(valid).toBeFalsy();

      valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeFalsy();
    });

    it('allows malware notification message changes with a Platinum license', () => {
      const policy = policyFactory();
      policy.windows.popup.malware.message = 'BOOM'; // make policy change
      const valid = isEndpointPolicyValidForLicense(policy, Platinum);
      expect(valid).toBeTruthy();
    });
    it('blocks windows malware notification message changes below Platinum licenses', () => {
      const policy = policyFactory();
      policy.windows.popup.malware.message = 'BOOM'; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, Gold);
      expect(valid).toBeFalsy();

      valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeFalsy();
    });
    it('blocks mac malware notification message changes below Platinum licenses', () => {
      const policy = policyFactory();
      policy.mac.popup.malware.message = 'BOOM'; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, Gold);
      expect(valid).toBeFalsy();

      valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeFalsy();
    });

    it('allows ransomware to be turned on for Platinum licenses', () => {
      const policy = policyFactoryWithoutPaidFeatures();
      policy.windows.ransomware.mode = ProtectionModes.prevent;
      policy.windows.ransomware.supported = true;

      const valid = isEndpointPolicyValidForLicense(policy, Platinum);
      expect(valid).toBeTruthy();
    });
    it('blocks ransomware to be turned on for Gold and below licenses', () => {
      const policy = policyFactoryWithoutPaidFeatures();
      policy.windows.ransomware.mode = ProtectionModes.prevent;

      let valid = isEndpointPolicyValidForLicense(policy, Gold);
      expect(valid).toBeFalsy();
      valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeFalsy();
    });

    it('allows ransomware notification to be turned on with a Platinum license', () => {
      const policy = policyFactoryWithoutPaidFeatures();
      policy.windows.popup.ransomware.enabled = true;
      policy.windows.ransomware.supported = true;
      const valid = isEndpointPolicyValidForLicense(policy, Platinum);
      expect(valid).toBeTruthy();
    });
    it('blocks ransomware notification to be turned on for Gold and below licenses', () => {
      const policy = policyFactoryWithoutPaidFeatures();
      policy.windows.popup.ransomware.enabled = true;
      let valid = isEndpointPolicyValidForLicense(policy, Gold);
      expect(valid).toBeFalsy();

      valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeFalsy();
    });

    it('allows ransomware notification message changes with a Platinum license', () => {
      const policy = policyFactory();
      policy.windows.popup.ransomware.message = 'BOOM';
      const valid = isEndpointPolicyValidForLicense(policy, Platinum);
      expect(valid).toBeTruthy();
    });
    it('blocks ransomware notification message changes for Gold and below licenses', () => {
      const policy = policyFactory();
      policy.windows.popup.ransomware.message = 'BOOM';
      let valid = isEndpointPolicyValidForLicense(policy, Gold);
      expect(valid).toBeFalsy();

      valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeFalsy();
    });

    it('allows default policyConfig with Basic', () => {
      const policy = policyFactoryWithoutPaidFeatures();
      const valid = isEndpointPolicyValidForLicense(policy, Basic);
      expect(valid).toBeTruthy();
    });
  });

  describe('unsetPolicyFeaturesAccordingToLicenseLevel', () => {
    it('does not change any malware fields with a Platinum license', () => {
      const policy = policyFactory();
      const popupMessage = 'WOOP WOOP';
      policy.windows.popup.malware.message = popupMessage;
      policy.mac.popup.malware.message = popupMessage;
      policy.windows.popup.malware.enabled = false;

      const retPolicy = unsetPolicyFeaturesAccordingToLicenseLevel(policy, Platinum);
      expect(retPolicy.windows.popup.malware.enabled).toBeFalsy();
      expect(retPolicy.windows.popup.malware.message).toEqual(popupMessage);
      expect(retPolicy.mac.popup.malware.message).toEqual(popupMessage);
    });

    it('does not change any ransomware fields with a Platinum license', () => {
      const policy = policyFactory();
      const popupMessage = 'WOOP WOOP';
      policy.windows.ransomware.mode = ProtectionModes.detect;
      policy.windows.popup.ransomware.enabled = false;
      policy.windows.popup.ransomware.message = popupMessage;

      const retPolicy = unsetPolicyFeaturesAccordingToLicenseLevel(policy, Platinum);
      expect(retPolicy.windows.ransomware.mode).toEqual(ProtectionModes.detect);
      expect(retPolicy.windows.popup.ransomware.enabled).toBeFalsy();
      expect(retPolicy.windows.popup.ransomware.message).toEqual(popupMessage);
    });

    it('resets Platinum-paid malware fields for lower license tiers', () => {
      const defaults = policyFactory(); // reference
      const policy = policyFactory(); // what we will modify, and should be reset
      const popupMessage = 'WOOP WOOP';
      policy.windows.popup.malware.message = popupMessage;
      policy.mac.popup.malware.message = popupMessage;
      policy.windows.popup.malware.enabled = false;

      policy.windows.popup.ransomware.message = popupMessage;
      policy.windows.popup.ransomware.enabled = false;
      const retPolicy = unsetPolicyFeaturesAccordingToLicenseLevel(policy, Gold);
      expect(retPolicy.windows.popup.malware.enabled).toEqual(
        defaults.windows.popup.malware.enabled
      );
      expect(retPolicy.windows.popup.malware.message).not.toEqual(popupMessage);

      // need to invert the test, since it could be either value
      expect(['', DefaultPolicyNotificationMessage]).toContain(
        retPolicy.windows.popup.malware.message
      );
    });

    it('resets Platinum-paid ransomware fields for lower license tiers', () => {
      const defaults = policyFactoryWithoutPaidFeatures(); // reference
      const policy = policyFactory(); // what we will modify, and should be reset
      const popupMessage = 'WOOP WOOP';
      policy.windows.popup.ransomware.message = popupMessage;

      const retPolicy = unsetPolicyFeaturesAccordingToLicenseLevel(policy, Gold);

      expect(retPolicy.windows.ransomware.mode).toEqual(defaults.windows.ransomware.mode);
      expect(retPolicy.windows.popup.ransomware.enabled).toEqual(
        defaults.windows.popup.ransomware.enabled
      );
      expect(retPolicy.windows.popup.ransomware.message).not.toEqual(popupMessage);

      // need to invert the test, since it could be either value
      expect(['', DefaultPolicyNotificationMessage]).toContain(
        retPolicy.windows.popup.ransomware.message
      );
    });

    it('sets ransomware supported field to false when license is below Platinum', () => {
      const defaults = policyFactoryWithoutPaidFeatures(); // reference
      const policy = policyFactory(); // what we will modify, and should be reset
      policy.windows.ransomware.supported = true;

      const retPolicy = unsetPolicyFeaturesAccordingToLicenseLevel(policy, Gold);

      expect(retPolicy.windows.ransomware.supported).toEqual(defaults.windows.ransomware.supported);
    });

    it('sets ransomware supported field to true when license is at Platinum', () => {
      const defaults = policyFactoryWithSupportedFeatures(); // reference
      const policy = policyFactory(); // what we will modify, and should be reset
      policy.windows.ransomware.supported = false;

      const retPolicy = unsetPolicyFeaturesAccordingToLicenseLevel(policy, Platinum);

      expect(retPolicy.windows.ransomware.supported).toEqual(defaults.windows.ransomware.supported);
    });
  });

  describe('policyFactoryWithoutPaidFeatures for gold and below license', () => {
    it('preserves non license-gated features', () => {
      const policy = policyFactory(); // what we will modify, and should be reset
      policy.windows.events.file = false;
      const retPolicy = policyFactoryWithoutPaidFeatures(policy);
      expect(retPolicy.windows.events.file).toBeFalsy();
    });
  });
});
