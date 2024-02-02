/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';

export type HasDynamicActions = {
  enhancements: {
    dynamicActions: DynamicActionManager;
  }
};

export const apiHasDynamicActions = (api: unknown): api is HasDynamicActions => {
  return Boolean(api && typeof (api as HasDynamicActions).enhancements?.dynamicActions === 'object');
};
