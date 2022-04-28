/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createStore } from 'redux';
import { Provider as ReduxProvider } from 'react-redux';
import { cloneDeep } from 'lodash';
import { set } from '@elastic/safer-lodash-set';

// @ts-expect-error Untyped local
import { getDefaultWorkpad } from '../../public/state/defaults';
import { CanvasWorkpad, CanvasElement, CanvasAsset, CanvasPage } from '../../types';

// @ts-expect-error untyped local
import { elementsRegistry } from '../../public/lib/elements_registry';
import { image } from '../../canvas_plugin_src/elements/image';
elementsRegistry.register(image);

import { getInitialState, getReducer, getMiddleware, patchDispatch } from '../addon/src/state';
export { ADDON_ID, ACTIONS_PANEL_ID } from '../addon/src/constants';

export interface Params {
  workpad?: CanvasWorkpad;
  pages?: CanvasPage[];
  elements?: CanvasElement[];
  assets?: CanvasAsset[];
}

export const reduxDecorator = (params: Params = {}) => {
  const state = cloneDeep(getInitialState());
  const { workpad, elements, assets, pages } = params;

  if (workpad) {
    set(state, 'persistent.workpad', workpad);
  }

  if (pages) {
    set(state, 'persistent.workpad.pages', pages);
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
    const store = createStore(getReducer(), state, getMiddleware());
    store.dispatch = patchDispatch(store, store.dispatch);
    return <ReduxProvider store={store}>{story()}</ReduxProvider>;
  };
};
