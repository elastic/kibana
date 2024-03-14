/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type {
  AlertingApiRequestHandlerContext,
  PluginSetupContract,
  PluginStartContract,
} from '@kbn/alerting-plugin/server';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type {
  CoreRequestHandlerContext,
  CustomRequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import type {
  DataViewsServerPluginSetup,
  DataViewsServerPluginStart,
} from '@kbn/data-views-plugin/server';
import type {
  PluginSetupContract as FeaturesPluginSetup,
  PluginStartContract as FeaturesPluginStart,
} from '@kbn/features-plugin/server';

import type { GuidedOnboardingPluginSetup } from '@kbn/guided-onboarding-plugin/server';
import type {
  LicensingApiRequestHandlerContext,
  LicensingPluginSetup,
  LicensingPluginStart,
} from '@kbn/licensing-plugin/server';

import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/server';

import type { RuleRegistryPluginSetupContract } from '@kbn/rule-registry-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';

import { SharePluginSetup } from '@kbn/share-plugin/server';
import { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { isoToEpochRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import type { ObservabilityAIAssistantService } from './features/ai_assistant/service';

export interface ObservabilityPluginSetup {
  /**
   * Returns a Observability AI Assistant service instance
   */
  service: ObservabilityAIAssistantService;
}

export interface ObservabilityPluginStart {
  /**
   * Returns a Observability AI Assistant service instance
   */
  service: ObservabilityAIAssistantService;
}

export interface ObservabilityPluginSetupDependencies {
  actions: ActionsPluginSetup;

  alerting: PluginSetupContract;
  cloud?: CloudSetup;

  dataViews: DataViewsServerPluginSetup;

  features: FeaturesPluginSetup;

  guidedOnboarding?: GuidedOnboardingPluginSetup;
  licensing: LicensingPluginSetup;

  ml: MlPluginSetup;

  ruleRegistry: RuleRegistryPluginSetupContract;
  security: SecurityPluginSetup;

  share: SharePluginSetup;
  spaces?: SpacesPluginSetup;
  taskManager: TaskManagerSetupContract;

  usageCollection?: UsageCollectionSetup;
}

export interface ObservabilityPluginStartDependencies {
  actions: ActionsPluginStart;

  alerting: PluginStartContract;
  cloud?: CloudStart;

  dataViews: DataViewsServerPluginStart;

  features: FeaturesPluginStart;

  licensing: LicensingPluginStart;

  ml: MlPluginStart;

  security: SecurityPluginStart;

  spaces?: SpacesPluginStart;
  taskManager: TaskManagerStartContract;
}

export type ObservabilityRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  core: Promise<CoreRequestHandlerContext>;
}>;

export const metricsExplorerViewSavedObjectAttributesRT = rt.intersection([
  rt.strict({
    name: nonEmptyStringRt,
  }),
  rt.UnknownRecord,
]);

export const metricsExplorerViewSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: metricsExplorerViewSavedObjectAttributesRT,
  }),
  rt.partial({
    version: rt.string,
    updated_at: isoToEpochRt,
  }),
]);
