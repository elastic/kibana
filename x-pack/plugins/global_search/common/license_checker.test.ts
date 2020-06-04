/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, of, BehaviorSubject } from 'rxjs';
import { licenseMock } from '../../licensing/common/licensing.mock';
import { ILicense, LicenseCheck } from '../../licensing/common/types';
import { LicenseChecker } from './license_checker';

describe('LicenseChecker', () => {
  const createLicense = (check: LicenseCheck): ILicense => {
    const license = licenseMock.createLicenseMock();
    license.check.mockReturnValue(check);
    return license;
  };

  const createLicense$ = (check: LicenseCheck): Observable<ILicense> => of(createLicense(check));

  it('returns the correct state of the license', () => {
    let checker = new LicenseChecker(createLicense$({ state: 'valid' }));
    expect(checker.getState()).toEqual({ valid: true });

    checker = new LicenseChecker(createLicense$({ state: 'expired' }));
    expect(checker.getState()).toEqual({ valid: false, message: 'expired' });

    checker = new LicenseChecker(createLicense$({ state: 'invalid' }));
    expect(checker.getState()).toEqual({ valid: false, message: 'invalid' });

    checker = new LicenseChecker(createLicense$({ state: 'unavailable' }));
    expect(checker.getState()).toEqual({ valid: false, message: 'unavailable' });
  });

  it('updates the state when the license changes', () => {
    const license$ = new BehaviorSubject<ILicense>(createLicense({ state: 'valid' }));

    const checker = new LicenseChecker(license$);
    expect(checker.getState()).toEqual({ valid: true });

    license$.next(createLicense({ state: 'expired' }));
    expect(checker.getState()).toEqual({ valid: false, message: 'expired' });

    license$.next(createLicense({ state: 'valid' }));
    expect(checker.getState()).toEqual({ valid: true });
  });

  it('removes the subscription when calling `clean`', () => {
    const mockUnsubscribe = jest.fn();
    const mockObs = {
      subscribe: jest.fn().mockReturnValue({ unsubscribe: mockUnsubscribe }),
    };

    const checker = new LicenseChecker(mockObs as any);

    expect(mockObs.subscribe).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).not.toHaveBeenCalled();

    checker.clean();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
