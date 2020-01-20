/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';
import { LicensingPluginSetup } from '../../licensing/server';
import { LicenseStatus } from '../common/types';

export interface AppServerPluginDependencies {
  licensing: LicensingPluginSetup;
  elasticsearch: ElasticsearchPlugin;
}

export interface RouteDependencies {
  getLicenseStatus: () => LicenseStatus;
  elasticsearch: ElasticsearchPlugin;
  router: IRouter;
}
