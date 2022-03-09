/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { DevToolsSetup } from '../../../../src/plugins/dev_tools/public';
import { SharePluginSetup } from '../../../../src/plugins/share/public';
import { LicensingPluginSetup } from '../../licensing/public';

export interface AppPublicPluginDependencies {
  licensing: LicensingPluginSetup;
  home: HomePublicPluginSetup;
  devTools: DevToolsSetup;
  share: SharePluginSetup;
}
