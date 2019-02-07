/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class Keystore {
  constructor(key: string) {
    return this;
  }
  public exists() {
    return false;
  }
  public reset() {
    return undefined;
  }
  public save() {
    return undefined;
  }
  public has() {
    return undefined;
  }
  public add(key: string, value: any) {
    return undefined;
  }
  public get(key: string): any {
    return undefined;
  }
}
