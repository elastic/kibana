/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetContext } from 'kea';
import { BehaviorSubject } from 'rxjs';

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { LicensingLogic, mountLicensingLogic } from './licensing_logic';

describe('LicensingLogic', () => {
  const mockLicense = licensingMock.createLicense();
  const mockLicense$ = new BehaviorSubject(mockLicense);
  const mount = (props?: object) =>
    mountLicensingLogic({ license$: mockLicense$, canManageLicense: true, ...props });

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  describe('canManageLicense', () => {
    it('sets value from props', () => {
      mount({ canManageLicense: false });
      expect(LicensingLogic.values.canManageLicense).toEqual(false);
    });
  });

  describe('setLicense()', () => {
    it('sets license value', () => {
      mount();
      LicensingLogic.actions.setLicense('test' as any);
      expect(LicensingLogic.values.license).toEqual('test');
    });
  });

  describe('setLicenseSubscription()', () => {
    it('sets licenseSubscription value', () => {
      mount();
      LicensingLogic.actions.setLicenseSubscription('test' as any);
      expect(LicensingLogic.values.licenseSubscription).toEqual('test');
    });
  });

  describe('licensing subscription', () => {
    describe('on mount', () => {
      it('subscribes to the license observable', () => {
        mount();
        expect(LicensingLogic.values.license).toEqual(mockLicense);
        expect(LicensingLogic.values.licenseSubscription).not.toBeNull();
      });
    });

    describe('on subscription update', () => {
      it('updates the license value', () => {
        mount();

        const nextMockLicense = licensingMock.createLicense({ license: { status: 'invalid' } });
        mockLicense$.next(nextMockLicense);

        expect(LicensingLogic.values.license).toEqual(nextMockLicense);
      });
    });

    describe('on unmount', () => {
      it('unsubscribes to the license observable', () => {
        const mockUnsubscribe = jest.fn();
        const unmount = mount({
          license$: { subscribe: () => ({ unsubscribe: mockUnsubscribe }) } as any,
        });
        unmount();
        expect(mockUnsubscribe).toHaveBeenCalled();
      });

      it('does not crash if no subscription exists', () => {
        const unmount = mount();
        LicensingLogic.actions.setLicenseSubscription(null as any);
        unmount();
      });
    });
  });

  describe('license check selectors', () => {
    beforeEach(() => {
      mount();
    });

    const updateLicense = (license: any) => {
      const updatedLicense = licensingMock.createLicense({ license });
      mockLicense$.next(updatedLicense);
    };

    describe('hasPlatinumLicense', () => {
      it('is true for platinum+ and trial licenses', () => {
        updateLicense({ status: 'active', type: 'platinum' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(true);

        updateLicense({ status: 'active', type: 'enterprise' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(true);

        updateLicense({ status: 'active', type: 'trial' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(true);
      });

      it('is false if the current license is expired', () => {
        updateLicense({ status: 'expired', type: 'platinum' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(false);

        updateLicense({ status: 'expired', type: 'enterprise' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(false);

        updateLicense({ status: 'expired', type: 'trial' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(false);
      });

      it('is false for licenses below platinum', () => {
        updateLicense({ status: 'active', type: 'basic' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(false);

        updateLicense({ status: 'active', type: 'standard' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(false);

        updateLicense({ status: 'active', type: 'gold' });
        expect(LicensingLogic.values.hasPlatinumLicense).toEqual(false);
      });
    });

    describe('hasGoldLicense', () => {
      it('is true for gold+ and trial licenses', () => {
        updateLicense({ status: 'active', type: 'gold' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(true);

        updateLicense({ status: 'active', type: 'platinum' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(true);

        updateLicense({ status: 'active', type: 'enterprise' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(true);

        updateLicense({ status: 'active', type: 'trial' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(true);
      });

      it('is false if the current license is expired', () => {
        updateLicense({ status: 'expired', type: 'gold' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(false);

        updateLicense({ status: 'expired', type: 'platinum' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(false);

        updateLicense({ status: 'expired', type: 'enterprise' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(false);

        updateLicense({ status: 'expired', type: 'trial' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(false);
      });

      it('is false for licenses below gold', () => {
        updateLicense({ status: 'active', type: 'basic' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(false);

        updateLicense({ status: 'active', type: 'standard' });
        expect(LicensingLogic.values.hasGoldLicense).toEqual(false);
      });
    });

    describe('isTrial', () => {
      it('is true for active trial license', () => {
        updateLicense({ status: 'active', type: 'trial' });
        expect(LicensingLogic.values.isTrial).toEqual(true);
      });

      it('is false if the trial license is expired', () => {
        updateLicense({ status: 'expired', type: 'trial' });
        expect(LicensingLogic.values.isTrial).toEqual(false);
      });

      it('is false for all non-trial licenses', () => {
        updateLicense({ status: 'active', type: 'basic' });
        expect(LicensingLogic.values.isTrial).toEqual(false);

        updateLicense({ status: 'active', type: 'standard' });
        expect(LicensingLogic.values.isTrial).toEqual(false);

        updateLicense({ status: 'active', type: 'gold' });
        expect(LicensingLogic.values.isTrial).toEqual(false);

        updateLicense({ status: 'active', type: 'platinum' });
        expect(LicensingLogic.values.isTrial).toEqual(false);

        updateLicense({ status: 'active', type: 'enterprise' });
        expect(LicensingLogic.values.isTrial).toEqual(false);
      });
    });
  });
});
