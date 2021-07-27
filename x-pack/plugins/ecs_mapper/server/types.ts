/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'src/core/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { License } from './services';

export interface Mapping {
  source_field: string;
  destination_field: string;
  copy_action?: string;
  format_action?: string;
  timestamp_format?: string;
}

export interface EcsMapperPluginDependencies {
  licensing: LicensingPluginSetup;
}

export interface RouteDependencies {
  router: IRouter;
  license: License;
}
