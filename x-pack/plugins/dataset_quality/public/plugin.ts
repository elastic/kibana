/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import {
  DatasetQualityPluginSetup,
  DatasetQualityPluginStart,
  DatasetQualitySetupDependencies,
  DatasetQualityStartDependencies,
} from './types';

export class DatasetQualityPlugin
  implements Plugin<DatasetQualityPluginSetup, DatasetQualityPluginStart>
{
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: DatasetQualitySetupDependencies) {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: DatasetQualityStartDependencies
  ): DatasetQualityPluginStart {
    return {};
  }
}
