/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  isEndpointPolicyValidForLicense,
  unsetPolicyFeaturesAboveLicenseLevel,
} from './policy_config';
import { DefaultMalwareMessage, factory } from '../endpoint/models/policy_config';
import { licenseMock } from '../../../licensing/common/licensing.mock';
import { LicenseService } from './license';
import { Subject } from 'rxjs';
import { ILicense } from '../../../licensing/common/types';

describe('policy_config and licenses', () => {
  let licenseEmitter: Subject<ILicense>;
  let licenseService: LicenseService;
  const Platinum = licenseMock.createLicense({ license: { type: 'platinum', mode: 'platinum' } });
  const Gold = licenseMock.createLicense({ license: { type: 'gold', mode: 'gold' } });
  const Basic = licenseMock.createLicense({ license: { type: 'basic', mode: 'basic' } });
  // mock license service
  beforeEach(() => {
    licenseEmitter = new Subject();
    licenseService = new LicenseService();
    licenseService.start(licenseEmitter);
  });
  afterEach(() => {
    licenseService.stop();
    licenseEmitter.complete();
  });

  describe('isEndpointPolicyValidForLicense', () => {
    it('allows malware notification to be disabled with a Platinum license', () => {
      licenseEmitter.next(Platinum); // set license level to Platinum
      const policy = factory();
      policy.windows.popup.malware.enabled = false; // make policy change
      const valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeTruthy();
    });
    it('blocks windows malware notification changes below Platinum licenses', () => {
      licenseEmitter.next(Gold);
      const policy = factory();
      policy.windows.popup.malware.enabled = false; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();

      licenseEmitter.next(Basic);
      valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();
    });

    it('blocks mac malware notification changes below Platinum licenses', () => {
      licenseEmitter.next(Gold);
      const policy = factory();
      policy.mac.popup.malware.enabled = false; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();

      licenseEmitter.next(Basic);
      valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();
    });

    it('allows malware notification message changes with a Platinum license', () => {
      licenseEmitter.next(Platinum); // set license level to Platinum
      const policy = factory();
      policy.windows.popup.malware.message = 'BOOM'; // make policy change
      const valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeTruthy();
    });
    it('blocks windows malware notification message changes below Platinum licenses', () => {
      licenseEmitter.next(Gold);
      const policy = factory();
      policy.windows.popup.malware.message = 'BOOM'; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();

      licenseEmitter.next(Basic);
      valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();
    });
    it('blocks mac malware notification message changes below Platinum licenses', () => {
      licenseEmitter.next(Gold);
      const policy = factory();
      policy.mac.popup.malware.message = 'BOOM'; // make policy change
      let valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();

      licenseEmitter.next(Basic);
      valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeFalsy();
    });

    it('allows default policyConfig with Basic', () => {
      licenseEmitter.next(Basic);
      const policy = factory();
      const valid = isEndpointPolicyValidForLicense(policy, licenseService);
      expect(valid).toBeTruthy();
    });
  });

  describe('unsetPolicyFeaturesAboveLicenseLevel', () => {
    it('does not change any fields with a Platinum license', () => {
      licenseEmitter.next(Platinum);
      const policy = factory();
      const popupMessage = 'WOOP WOOP';
      policy.windows.popup.malware.message = popupMessage;
      policy.mac.popup.malware.message = popupMessage;
      policy.windows.popup.malware.enabled = false;

      const retPolicy = unsetPolicyFeaturesAboveLicenseLevel(policy, licenseService);
      expect(retPolicy.windows.popup.malware.enabled).toBeFalsy();
      expect(retPolicy.windows.popup.malware.message).toEqual(popupMessage);
      expect(retPolicy.mac.popup.malware.message).toEqual(popupMessage);
    });
    it('resets Platinum-paid fields for lower license tiers', () => {
      licenseEmitter.next(Gold);
      const defaults = factory(); // reference
      const policy = factory(); // what we will modify, and should be reset
      const popupMessage = 'WOOP WOOP';
      policy.windows.popup.malware.message = popupMessage;
      policy.mac.popup.malware.message = popupMessage;
      policy.windows.popup.malware.enabled = false;

      const retPolicy = unsetPolicyFeaturesAboveLicenseLevel(policy, licenseService);
      expect(retPolicy.windows.popup.malware.enabled).toEqual(
        defaults.windows.popup.malware.enabled
      );
      expect(retPolicy.windows.popup.malware.message).not.toEqual(popupMessage);
      expect(retPolicy.mac.popup.malware.message).not.toEqual(popupMessage);

      // need to invert the test, since it could be either value
      expect(['', DefaultMalwareMessage]).toContain(retPolicy.windows.popup.malware.message);
    });
  });
});
