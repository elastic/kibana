/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { App } from './app';
import { ThreatIntelligencePluginSetup, ThreatIntelligencePluginStart } from './types';

const getComponent = () => App;

export class ThreatIntelligencePlugin implements Plugin<void, void> {
  public setup(core: CoreSetup): ThreatIntelligencePluginSetup {
    return {};
  }
  public start(_core: CoreStart): ThreatIntelligencePluginStart {
    return { getComponent };
  }
  public stop() {}
}
