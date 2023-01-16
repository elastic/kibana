/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ManagementSetup } from '@kbn/management-plugin/public';

import { CloudSetup } from '@kbn/cloud-plugin/public';
import { BreadcrumbService } from './application/services/breadcrumbs';

export interface CloudDataMigrationPluginSetup {
  cloud: CloudSetup;
  management: ManagementSetup;
  breadcrumbService: BreadcrumbService;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudDataMigrationPluginStart {}
