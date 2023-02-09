/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { CustomBrandingPluginSetup, CustomBrandingPluginStart } from './types';

export class CustomBrandingPlugin
  implements Plugin<CustomBrandingPluginSetup, CustomBrandingPluginStart>
{
  public setup(core: CoreSetup): CustomBrandingPluginSetup {
    return {};
  }

  public start(core: CoreStart): CustomBrandingPluginStart {
    return {};
  }

  public stop() {}
}
