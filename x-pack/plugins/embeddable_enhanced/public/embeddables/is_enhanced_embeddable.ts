/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { EnhancedEmbeddable } from '../types';

export const isEnhancedEmbeddable = <E>(
  maybeEnhancedEmbeddable: E
): maybeEnhancedEmbeddable is EnhancedEmbeddable<E extends IEmbeddable ? E : never> =>
  typeof (maybeEnhancedEmbeddable as EnhancedEmbeddable<E extends IEmbeddable ? E : never>)
    ?.enhancements?.dynamicActions === 'object';
