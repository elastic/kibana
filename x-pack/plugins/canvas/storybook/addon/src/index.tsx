/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* es-lint-disable import/no-extraneous-dependencies */

import React from 'react';
import { createStore } from 'redux';
import { Provider as ReduxProvider } from 'react-redux';
import { set, cloneDeep } from 'lodash';

// @ts-expect-error Untyped local
import { getDefaultWorkpad } from '../../../public/state/defaults';
import { CanvasWorkpad, CanvasElement, CanvasAsset } from '../../../types';

import { initialState, reducer, middleware, patchDispatch } from './state';

// @ts-expect-error untyped local
import { elementsRegistry } from '../../../public/lib/elements_registry';
import { image } from '../../../canvas_plugin_src/elements/image';
elementsRegistry.register(image);

export { ADDON_ID, ACTIONS_PANEL_ID } from './constants';

interface Params {
  workpad?: CanvasWorkpad;
  elements?: CanvasElement[];
  assets?: CanvasAsset[];
}

export const withCanvas = (params: Params = {}) => {
  const state = cloneDeep(initialState);
  const { workpad, elements, assets } = params;

  if (workpad) {
    set(state, 'persistent.workpad', workpad);
  }

  if (elements) {
    set(state, 'persistent.workpad.pages.0.elements', elements);
  }

  if (assets) {
    set(
      state,
      'assets',
      assets.reduce((obj: Record<string, CanvasAsset>, item) => {
        obj[item.id] = item;
        return obj;
      }, {})
    );
  }

  return (story: Function) => {
    const store = createStore(reducer, state, middleware);
    store.dispatch = patchDispatch(store, store.dispatch);
    return <ReduxProvider store={store}>{story()}</ReduxProvider>;
  };
};
