/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext } from '../../../../src/core/public';
import { AdvancedUiActionsPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new AdvancedUiActionsPublicPlugin(initializerContext);
}

export { AdvancedUiActionsPublicPlugin as Plugin };
export {
  SetupContract as AdvancedUiActionsSetup,
  StartContract as AdvancedUiActionsStart,
} from './plugin';

export {
  ActionFactoryDefinition as UiActionsEnhancedActionFactoryDefinition,
  ActionFactory as UiActionsEnhancedActionFactory,
  SerializedAction as UiActionsEnhancedSerializedAction,
  SerializedEvent as UiActionsEnhancedSerializedEvent,
  AbstractActionStorage as UiActionsEnhancedAbstractActionStorage,
  DynamicActionManager as UiActionsEnhancedDynamicActionManager,
  DynamicActionManagerParams as UiActionsEnhancedDynamicActionManagerParams,
  DynamicActionManagerState as UiActionsEnhancedDynamicActionManagerState,
  MemoryActionStorage as UiActionsEnhancedMemoryActionStorage,
  BaseActionFactoryContext as UiActionsEnhancedBaseActionFactoryContext,
  BaseActionConfig as UiActionsEnhancedBaseActionConfig,
} from './dynamic_actions';

export { DynamicActionsState } from './services/ui_actions_service_enhancements';

export {
  DrilldownDefinition as UiActionsEnhancedDrilldownDefinition,
  DrilldownTemplate as UiActionsEnhancedDrilldownTemplate,
} from './drilldowns';
export {
  urlDrilldownCompileUrl,
  UrlDrilldownCollectConfig,
  UrlDrilldownConfig,
  UrlDrilldownGlobalScope,
  urlDrilldownGlobalScopeProvider,
  UrlDrilldownScope,
  urlDrilldownValidateUrl,
  urlDrilldownValidateUrlTemplate,
} from './drilldowns/url_drilldown';
