/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { Observable, Subscription } from 'rxjs';

import { ILicense } from '../../../../../licensing/public';

export interface ILicensingValues {
  license: ILicense | null;
  licenseSubscription: Subscription | null;
  hasPlatinumLicense: boolean;
  hasGoldLicense: boolean;
}
export interface ILicensingActions {
  setLicense(license: ILicense): ILicense;
  setLicenseSubscription(licenseSubscription: Subscription): Subscription;
}

export const LicensingLogic = kea<MakeLogicType<ILicensingValues, ILicensingActions>>({
  path: ['enterprise_search', 'licensing_logic'],
  actions: {
    setLicense: (license) => license,
    setLicenseSubscription: (licenseSubscription) => licenseSubscription,
  },
  reducers: {
    license: [
      null,
      {
        setLicense: (_, license) => license,
      },
    ],
    licenseSubscription: [
      null,
      {
        setLicenseSubscription: (_, licenseSubscription) => licenseSubscription,
      },
    ],
  },
  selectors: {
    hasPlatinumLicense: [
      (selectors) => [selectors.license],
      (license) => {
        const qualifyingLicenses = ['platinum', 'enterprise', 'trial'];
        return license?.isActive && qualifyingLicenses.includes(license?.type);
      },
    ],
    hasGoldLicense: [
      (selectors) => [selectors.license],
      (license) => {
        const qualifyingLicenses = ['gold', 'platinum', 'enterprise', 'trial'];
        return license?.isActive && qualifyingLicenses.includes(license?.type);
      },
    ],
  },
  events: ({ props, actions, values }) => ({
    afterMount: () => {
      const licenseSubscription = props.license$.subscribe(async (license: ILicense) => {
        actions.setLicense(license);
      });
      actions.setLicenseSubscription(licenseSubscription);
    },
    beforeUnmount: () => {
      if (values.licenseSubscription) values.licenseSubscription.unsubscribe();
    },
  }),
});

/**
 * Mount/props helper
 */
interface ILicensingLogicProps {
  license$: Observable<ILicense>;
}
export const mountLicensingLogic = (props: ILicensingLogicProps) => {
  LicensingLogic(props);
  const unmount = LicensingLogic.mount();
  return unmount;
};
