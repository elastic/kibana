/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedUiActionsServerPlugin } from './plugin';

export function plugin() {
  return new AdvancedUiActionsServerPlugin();
}

export { AdvancedUiActionsServerPlugin as Plugin };
export {
  SetupContract as AdvancedUiActionsSetup,
  StartContract as AdvancedUiActionsStart,
} from './plugin';

export {
  ActionFactoryDefinition as UiActionsEnhancedActionFactoryDefinition,
  ActionFactory as UiActionsEnhancedActionFactory,
} from './types';

export {
  DynamicActionsState,
  BaseActionConfig as UiActionsEnhancedBaseActionConfig,
  SerializedAction as UiActionsEnhancedSerializedAction,
  SerializedEvent as UiActionsEnhancedSerializedEvent,
} from '../common/types';
