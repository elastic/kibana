/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import { getExplainLogRateSpikesComponent } from './api';
import { setStartServices } from './kibana_services';
import { AiopsPluginSetup, AiopsPluginStart } from './types';

export class AiopsPlugin implements Plugin<AiopsPluginSetup, AiopsPluginStart> {
  public setup(core: CoreSetup) {}

  public start(core: CoreStart) {
    setStartServices(core, {});
    return {
      getExplainLogRateSpikesComponent,
    };
  }

  public stop() {}
}
