/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { DevToolsSetup } from '../../../../src/plugins/dev_tools/public';
import { LicensingPluginSetup } from '../../licensing/public';

export interface PluginDependencies {
  licensing: LicensingPluginSetup;
  home: HomePublicPluginSetup;
  devTools: DevToolsSetup;
}
