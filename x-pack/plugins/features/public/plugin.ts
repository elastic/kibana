/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/public';
import { FeaturesAPIClient } from './features_api_client';

export class FeaturesPlugin implements Plugin<FeaturesPluginSetup, FeaturesPluginStart> {
  private apiClient?: FeaturesAPIClient;

  public setup(core: CoreSetup) {
    this.apiClient = new FeaturesAPIClient(core.http);
  }

  public start() {
    return {
      getFeatures: () => this.apiClient!.getFeatures(),
    };
  }

  public stop() {}
}

export type FeaturesPluginSetup = ReturnType<FeaturesPlugin['setup']>;
export type FeaturesPluginStart = ReturnType<FeaturesPlugin['start']>;
