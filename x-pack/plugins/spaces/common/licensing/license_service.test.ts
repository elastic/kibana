/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import { licenseMock } from '../../../licensing/common/licensing.mock';
import { SpacesLicenseService } from './license_service';
import { LICENSE_TYPE, LicenseType } from '../../../licensing/common/types';

describe('license#isEnabled', function () {
  it('should indicate that Spaces is disabled when there is no license information', () => {
    const serviceSetup = new SpacesLicenseService().setup({
      license$: of(undefined as any),
    });
    expect(serviceSetup.license.isEnabled()).toEqual(false);
  });

  it('should indicate that Spaces is disabled when xpack is unavailable', () => {
    const rawLicenseMock = licenseMock.createLicenseMock();
    rawLicenseMock.isAvailable = false;
    const serviceSetup = new SpacesLicenseService().setup({
      license$: of(rawLicenseMock),
    });
    expect(serviceSetup.license.isEnabled()).toEqual(false);
  });

  for (const level in LICENSE_TYPE) {
    if (isNaN(level as any)) {
      it(`should indicate that Spaces is enabled with a ${level} license`, () => {
        const rawLicense = licenseMock.createLicense({
          license: {
            status: 'active',
            type: level as LicenseType,
          },
        });

        const serviceSetup = new SpacesLicenseService().setup({
          license$: of(rawLicense),
        });
        expect(serviceSetup.license.isEnabled()).toEqual(true);
      });
    }
  }
});
