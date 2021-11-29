/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EmbeddableFactory,
  EmbeddableStateTransfer,
} from '../../../../../src/plugins/embeddable/public';

export interface CanvasEmbeddablesService {
  getEmbeddableFactories: () => IterableIterator<EmbeddableFactory>;
  getStateTransfer: () => EmbeddableStateTransfer;
}
