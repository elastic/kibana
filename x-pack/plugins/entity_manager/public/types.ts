/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin as PluginClass } from '@kbn/core/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { CloudStart } from '@kbn/cloud-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import { ObservabilityAIAssistantPublicSetup } from '@kbn/observability-ai-assistant-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { EntityClient } from './lib/entity_client';

export interface EntityManagerPluginSetup {
  data: DataPublicPluginSetup;
  observability: ObservabilityAIAssistantPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  serverless?: ServerlessPluginSetup;
  usageCollection: UsageCollectionSetup;
}

export interface EntityManagerPluginStart {
  data: DataPublicPluginStart;
  presentationUtil: PresentationUtilPluginStart;
  cloud?: CloudStart;
  serverless?: ServerlessPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
}

export interface EntityManagerPublicPluginSetup {
  entityClient: EntityClient;
}

export interface EntityManagerPublicPluginStart {
  entityClient: EntityClient;
}

export type EntityManagerPluginClass = PluginClass<
  EntityManagerPublicPluginSetup,
  EntityManagerPublicPluginStart
>;
