/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, Observable } from 'rxjs';
import { ILicense, LicenseType } from '@kbn/licensing-plugin/server';

export class LicensingService {
  private readonly license$: Observable<ILicense>;

  constructor(license$: Observable<ILicense>) {
    this.license$ = license$;
  }

  public async getLicenseInformation(): Promise<ILicense> {
    return firstValueFrom(this.license$);
  }

  public async isAtLeast(level: LicenseType): Promise<boolean> {
    const license = await this.getLicenseInformation();
    return !!license && license.isAvailable && license.isActive && license.hasAtLeast(level);
  }

  public async isAtLeastPlatinum() {
    return this.isAtLeast('platinum');
  }

  public async isAtLeastGold() {
    return this.isAtLeast('gold');
  }

  public async isAtLeastEnterprise() {
    return this.isAtLeast('enterprise');
  }
}
