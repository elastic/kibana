/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { UiActionsEnhancedDynamicActionManager as DynamicActionManager } from '@kbn/ui-actions-enhanced-plugin/public';

export type EnhancedEmbeddable<E extends IEmbeddable = IEmbeddable> = E & {
  enhancements: {
    /**
     * Default implementation of dynamic action manager for embeddables.
     */
    dynamicActions: DynamicActionManager;
  };
};

export interface EnhancedEmbeddableContext {
  embeddable: EnhancedEmbeddable;
}
