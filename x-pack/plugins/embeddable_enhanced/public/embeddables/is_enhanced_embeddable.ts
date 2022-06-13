/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { EnhancedEmbeddable } from '../types';

export const isEnhancedEmbeddable = <E>(
  maybeEnhancedEmbeddable: E
): maybeEnhancedEmbeddable is EnhancedEmbeddable<E extends IEmbeddable ? E : never> =>
  typeof (maybeEnhancedEmbeddable as EnhancedEmbeddable<E extends IEmbeddable ? E : never>)
    ?.enhancements?.dynamicActions === 'object';
