/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import { ObservabilityPublicSetup } from '@kbn/observability-plugin/public';
import {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessObservabilityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessObservabilityPluginStart {}

export interface ServerlessObservabilityPluginSetupDependencies {
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  serverless: ServerlessPluginSetup;
  management: ManagementSetup;
}

export interface ServerlessObservabilityPluginStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  serverless: ServerlessPluginStart;
  management: ManagementStart;
  cloud: CloudStart;
  data: DataPublicPluginStart;
}
