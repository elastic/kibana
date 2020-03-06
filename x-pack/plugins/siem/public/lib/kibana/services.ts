/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartServices } from '../../plugin';

type GlobalServices = Pick<StartServices, 'http' | 'uiSettings'>;

export class KibanaServices {
  private static kibanaVersion?: string;
  private static services?: GlobalServices;

  public static init({
    http,
    kibanaVersion,
    uiSettings,
  }: StartServices & { kibanaVersion: string }) {
    this.services = { http, uiSettings };
    this.kibanaVersion = kibanaVersion;
  }

  public static get(): GlobalServices {
    if (!this.services) {
      throw new Error(
        'Kibana services not initialized - are you trying to import this module from outside of the SIEM app?'
      );
    }

    return this.services;
  }

  public static getKibanaVersion(): string {
    if (!this.kibanaVersion) {
      throw new Error(
        'Kibana services not initialized - are you trying to import this module from outside of the SIEM app?'
      );
    }

    return this.kibanaVersion;
  }
}
