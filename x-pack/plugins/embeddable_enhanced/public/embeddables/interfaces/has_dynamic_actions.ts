/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';

export interface HasDynamicActions {
  enhancements: {
    dynamicActions: DynamicActionManager;
  };
}

export const apiHasDynamicActions = (api: unknown): api is HasDynamicActions => {
  return Boolean(
    api && typeof (api as HasDynamicActions).enhancements?.dynamicActions === 'object'
  );
};
