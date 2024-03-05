/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import React from 'react';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { MapEmbeddableSerializedState, MapApi } from './types';

export const registerMapEmbeddable = () => {
  const factory: ReactEmbeddableFactory<
    MapEmbeddableSerializedState,
    MapApi
  > = {
    deserializeState: (state) => {
      console.log('state', state);
      return state.rawState;
    },
    getComponent: async (state, maybeId) => {
      return RegisterReactEmbeddable((apiRef) => {
        return <div>hello world</div>;
      });
    },
  };

  registerReactEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, factory);
};
