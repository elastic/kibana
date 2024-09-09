/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EmbeddableFactory,
  type EmbeddableStateTransfer,
  ReactEmbeddableSavedObject,
} from '@kbn/embeddable-plugin/public';
import { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';

export interface CanvasEmbeddablesService {
  reactEmbeddableRegistryHasKey: (key: string) => boolean;
  getReactEmbeddableSavedObjects: <
    TSavedObjectAttributes extends FinderAttributes
  >() => IterableIterator<[string, ReactEmbeddableSavedObject<TSavedObjectAttributes>]>;
  getEmbeddableFactories: () => IterableIterator<EmbeddableFactory>;
  getStateTransfer: () => EmbeddableStateTransfer;
}
