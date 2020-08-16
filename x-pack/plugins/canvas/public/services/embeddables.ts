/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmbeddableFactory } from '../../../../../src/plugins/embeddable/public';
import { CanvasServiceFactory } from '.';

export interface EmbeddablesService {
  getEmbeddableFactories: () => IterableIterator<EmbeddableFactory>;
}

export const embeddablesServiceFactory: CanvasServiceFactory<EmbeddablesService> = async (
  _coreSetup,
  _coreStart,
  _setupPlugins,
  startPlugins
) => ({
  getEmbeddableFactories: startPlugins.embeddable.getEmbeddableFactories,
});
