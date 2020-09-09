/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AdvancedUiActionsPublicPlugin } from './plugin';

export function plugin() {
  return new AdvancedUiActionsPublicPlugin();
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
} from './types';
