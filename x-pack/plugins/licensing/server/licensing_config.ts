/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { schema } from './schema';

export class LicensingConfig {
  public isEnabled: boolean;
  public clusterSource: string;
  public pollingFrequency: number;

  /**
   * @internal
   */
  constructor(rawConfig: TypeOf<typeof schema>, env: PluginInitializerContext['env']) {
    this.isEnabled = rawConfig.isEnabled;
    this.clusterSource = rawConfig.clusterSource;
    this.pollingFrequency = rawConfig.pollingFrequency;
  }
}
