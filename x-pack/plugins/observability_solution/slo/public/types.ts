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

import { SloPlugin } from './plugin';

export interface SloPublicPluginsSetup {
  observability: ObservabilityPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  licensing: LicensingPluginSetup;
  share: SharePluginSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
}

export interface SloPublicPluginsStart {
  observability: ObservabilityPublicStart;
  observabilityShared: ObservabilitySharedPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  navigation: NavigationPublicPluginStart;
  share: SharePluginStart;
  licensing: LicensingPluginStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
}

export type SloPublicSetup = ReturnType<SloPlugin['setup']>;
export type SloPublicStart = ReturnType<SloPlugin['start']>;
