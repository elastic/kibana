/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subscription } from 'rxjs';
import { ILicense } from '../../../licensing/common/types';

export interface SpacesLicense {
  isEnabled(): boolean;
}

interface SetupDeps {
  license$: Observable<ILicense>;
}

export class SpacesLicenseService {
  private licenseSubscription?: Subscription;

  public setup({ license$ }: SetupDeps) {
    let rawLicense: Readonly<ILicense> | undefined;

    this.licenseSubscription = license$.subscribe((nextRawLicense) => {
      rawLicense = nextRawLicense;
    });

    return {
      license: Object.freeze({
        isEnabled: () => this.isSpacesEnabledFromRawLicense(rawLicense),
      }),
    };
  }

  public stop() {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
    }
  }

  private isSpacesEnabledFromRawLicense(rawLicense: Readonly<ILicense> | undefined) {
    if (!rawLicense || !rawLicense.isAvailable) {
      return false;
    }

    const licenseCheck = rawLicense.check('spaces', 'basic');
    return licenseCheck.state !== 'unavailable' && licenseCheck.state !== 'invalid';
  }
}
