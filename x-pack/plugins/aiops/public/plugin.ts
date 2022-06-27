/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

import { AiopsPluginSetup, AiopsPluginStart } from './types';

// move to ./types like above // remove
export interface AiOpsStartDependencies {
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
}

export class AiopsPlugin implements Plugin<AiopsPluginSetup, AiopsPluginStart> {
  public setup(core: CoreSetup) {}
  public start(core: CoreStart) {}
  public stop() {}
}
