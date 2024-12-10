/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverSetup } from '@kbn/discover-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { ObservabilityPublicSetup } from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { StreamsPluginStart, StreamsPluginSetup } from '@kbn/streams-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessObservabilityPublicSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessObservabilityPublicStart {}

export interface ServerlessObservabilityPublicSetupDependencies {
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  serverless: ServerlessPluginSetup;
  management: ManagementSetup;
  discover: DiscoverSetup;
  streams?: StreamsPluginSetup;
}

export interface ServerlessObservabilityPublicStartDependencies {
  observabilityShared: ObservabilitySharedPluginStart;
  serverless: ServerlessPluginStart;
  management: ManagementStart;
  data: DataPublicPluginStart;
  security: SecurityPluginStart;
  streams?: StreamsPluginStart;
}
