/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { UMAuthAdapter, UMAuthContainer } from './adapter_types';

// look at index-management for guidance, subscribe to licensecheckerresultsgenerator
// then check the license status
export class UMXPackAuthAdapter implements UMAuthAdapter {
  constructor(private readonly xpack: UMAuthContainer) {
    this.xpack = xpack;
  }
  public getLicenseType(): string | null {
    // console.log(Object.keys(this.xpack.info));
    // console.log(this.xpack.info);
    // console.log(this.xpack.info.feature('uptime_monitoring').getLicenseCheckResults());
    // console.log(this.xpack.info);
    // console.log(JSON.stringify(this.xpack, null, 2));
    // console.log(get(this.xpack, 'info.license.type', null));
    return get(this.xpack, 'info.license.type', null);
  }
  public licenseIsActive(): boolean {
    return get(this.xpack, 'info.license.isActive', false);
  }
}
