/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';
import Iron from 'iron';

export class SecretStore {
  public readonly hide: (deets: any) => any;
  public readonly unhide: (deets: any) => any;

  constructor() {
    const secretKey = crypto.randomBytes(32).toString('hex');
    const weakMap = new WeakMap();
    weakMap.set(this, {
      [secretKey]: crypto.randomBytes(256).toString('hex'),
    });
    this.hide = async (deets: any) => {
      return await Iron.seal(deets, weakMap.get(this)[secretKey], Iron.defaults);
    };
    this.unhide = async (deets: any) => {
      return await Iron.unseal(deets, weakMap.get(this)[secretKey], Iron.defaults);
    };
  }
}
