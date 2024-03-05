/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  ActionTypeRegistryContract,
  RuleTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { SloPlugin } from './plugin';

export interface SloPublicPluginsSetup {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
  share: SharePluginSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
  serverless?: ServerlessPluginSetup;
  presentationUtil?: PresentationUtilPluginStart;
}

export interface SloPublicPluginsStart {
  actionTypeRegistry: ActionTypeRegistryContract;
  cloud?: CloudStart;
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  share: SharePluginStart;
  licensing: LicensingPluginStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  presentationUtil: PresentationUtilPluginStart;
  serverless?: ServerlessPluginStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  ruleTypeRegistry: RuleTypeRegistryContract;
}

export type SloPublicSetup = ReturnType<SloPlugin['setup']>;
export type SloPublicStart = ReturnType<SloPlugin['start']>;
