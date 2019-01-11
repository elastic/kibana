/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { UMAuthAdapter } from './adapter_types';

export class UMMemoryAuthAdapter implements UMAuthAdapter {
  constructor(private readonly xpack: any) {
    this.xpack = xpack;
  }

  public getLicenseType = (): string | null => get(this.xpack, 'info.license.type', null);

  public licenseIsActive = (): boolean => this.xpack.info.license.isActive;
}
