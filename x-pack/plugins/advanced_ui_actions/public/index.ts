/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export { ActionWizard } from './components';
export {
  ActionFactoryDefinition as AdvancedUiActionsActionFactoryDefinition,
  AnyActionFactoryDefinition as AdvancedUiActionsAnyActionFactoryDefinition,
  ActionFactory as AdvancedUiActionsActionFactory,
  AnyActionFactory as AdvancedUiActionsAnyActionFactory,
} from './services/action_factory_service';
export {
  Configurable as AdvancedUiActionsConfigurable,
  CollectConfigProps as AdvancedUiActionsCollectConfigProps,
} from './util';
