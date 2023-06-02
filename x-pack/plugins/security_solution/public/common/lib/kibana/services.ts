/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StartPlugins } from '../../../types';

type GlobalServices = Pick<CoreStart, 'application' | 'http' | 'uiSettings' | 'notifications'> &
  Pick<StartPlugins, 'data' | 'unifiedSearch'>;

export class KibanaServices {
  private static kibanaBranch?: string;
  private static kibanaVersion?: string;
  private static prebuiltRulesPackageVersion?: string;
  private static services?: GlobalServices;

  public static init({
    http,
    application,
    data,
    unifiedSearch,
    kibanaBranch,
    kibanaVersion,
    prebuiltRulesPackageVersion,
    uiSettings,
    notifications,
  }: GlobalServices & {
    kibanaBranch: string;
    kibanaVersion: string;
    prebuiltRulesPackageVersion?: string;
  }) {
    this.services = { application, data, http, uiSettings, unifiedSearch, notifications };
    this.kibanaBranch = kibanaBranch;
    this.kibanaVersion = kibanaVersion;
    this.prebuiltRulesPackageVersion = prebuiltRulesPackageVersion;
  }

  public static get(): GlobalServices {
    if (!this.services) {
      this.throwUninitializedError();
    }

    return this.services;
  }

  public static getKibanaBranch(): string {
    if (!this.kibanaBranch) {
      this.throwUninitializedError();
    }

    return this.kibanaBranch;
  }

  public static getKibanaVersion(): string {
    if (!this.kibanaVersion) {
      this.throwUninitializedError();
    }

    return this.kibanaVersion;
  }

  public static getPrebuiltRulesPackageVersion(): string | undefined {
    return this.prebuiltRulesPackageVersion;
  }

  private static throwUninitializedError(): never {
    throw new Error(
      'Kibana services not initialized - are you trying to import this module from outside of the SIEM app?'
    );
  }
}
