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
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { inject } from '../../common/embeddable';
import type { MapApi, MapSerializeState } from './types';

export const registerMapEmbeddable = () => {
  const factory: ReactEmbeddableFactory<
    MapSerializeState,
    MapApi
  > = {
    type: MAP_SAVED_OBJECT_TYPE,
    deserializeState: (state) => {
      return state.rawState
        ? inject(state.rawState as EmbeddableStateWithType, state.references ?? []) as unknown as MapSerializeState
        : {};
    },
    buildEmbeddable: async (state, buildApi) => {
      const { getMapEmbeddable } = await import('./get_map_embeddable');
      return await getMapEmbeddable(state, buildApi);
    },
  };

  registerReactEmbeddableFactory(factory);
};
