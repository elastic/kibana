/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { HasDynamicActions } from './embeddables/interfaces/has_dynamic_actions';

export type EnhancedEmbeddable<E extends IEmbeddable = IEmbeddable> = E & HasDynamicActions;

/**
 * @deprecated use `EmbeddableApiContext` from `@kbn/presentation-publishing`
 */
export interface EnhancedEmbeddableContext {
  embeddable: EnhancedEmbeddable;
}
