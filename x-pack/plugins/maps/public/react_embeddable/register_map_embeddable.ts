/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ReactEmbeddableFactory,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { MapEmbeddableInput } from '../embeddable/types';
import type { MapApi } from './types';

export const registerMapEmbeddable = () => {
  const factory: ReactEmbeddableFactory<
    MapEmbeddableInput,
    MapApi
  > = {
    deserializeState: (state) => {
      return state.rawState as MapEmbeddableInput;
    },
    getComponent: async (state, maybeId) => {
      const { getMapEmbeddable } = await import('./get_map_embeddable');
      return await getMapEmbeddable(state, maybeId);
    },
  };

  registerReactEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, factory);
};
