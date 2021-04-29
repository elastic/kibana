/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';

type GlobalServices = Pick<CoreStart, 'http'>;

export class KibanaServices {
  private static kibanaVersion?: string;
  private static services?: GlobalServices;

  public static init({ http, kibanaVersion }: GlobalServices & { kibanaVersion: string }) {
    this.services = { http };
    this.kibanaVersion = kibanaVersion;
  }

  public static get(): GlobalServices {
    if (!this.services) {
      this.throwUninitializedError();
    }

    return this.services;
  }

  public static getKibanaVersion(): string {
    if (!this.kibanaVersion) {
      this.throwUninitializedError();
    }

    return this.kibanaVersion;
  }

  private static throwUninitializedError(): never {
    throw new Error(
      'Kibana services not initialized - are you trying to import this module from outside of the Cases app?'
    );
  }
}
