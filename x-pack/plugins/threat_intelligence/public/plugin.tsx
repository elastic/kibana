/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { IndicatorsPage } from './modules/indicators/indicators_page';
import {
  ThreatIntelligencePluginSetup,
  ThreatIntelligencePluginStart,
  ThreatIntelligencePluginStartDeps,
} from './types';

const createAppComponent = (services: CoreStart) => {
  return () => (
    <KibanaContextProvider services={services}>
      <IndicatorsPage />
    </KibanaContextProvider>
  );
};

export class ThreatIntelligencePlugin implements Plugin<void, void> {
  public setup(core: CoreSetup): ThreatIntelligencePluginSetup {
    return {};
  }
  public start(
    core: CoreStart,
    plugins: ThreatIntelligencePluginStartDeps
  ): ThreatIntelligencePluginStart {
    const App = createAppComponent({ ...core, ...plugins });
    return { getComponent: () => App };
  }
  public stop() {}
}
