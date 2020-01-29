/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementSetup } from 'src/plugins/management/public';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import { LicensingPluginSetup } from '../../licensing/public';
import { DataPublicPluginSetup } from '../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';

export interface Dependencies {
  home: HomePublicPluginSetup;
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
  charts: ChartsPluginStart;
  data: DataPublicPluginSetup;
}
