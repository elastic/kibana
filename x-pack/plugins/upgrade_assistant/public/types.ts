/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from 'src/plugins/discover/public';
import { ManagementSetup } from 'src/plugins/management/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';

import { CloudSetup } from '../../cloud/public';

export interface AppServicesContext {
  management: ManagementSetup;
  cloud: CloudSetup;
  discover: DiscoverStart;
  data: DataPublicPluginStart;
}
