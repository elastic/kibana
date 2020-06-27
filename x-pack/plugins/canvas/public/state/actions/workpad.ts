/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { without, includes } from 'lodash';
import { createThunk } from '../../lib/create_thunk';
import { getWorkpadColors } from '../selectors/workpad';
// @ts-expect-error
import { fetchAllRenderables } from './elements';
import { CanvasWorkpad } from '../../../types';

export const sizeWorkpad = createAction<{ height: number; width: number }>('sizeWorkpad');
export const setName = createAction<string>('setName');
export const setWriteable = createAction<boolean>('setWriteable');
export const setColors = createAction<string[]>('setColors');
export const setRefreshInterval = createAction<number>('setRefreshInterval');
export const setWorkpadCSS = createAction<string>('setWorkpadCSS');
export const enableAutoplay = createAction<boolean>('enableAutoplay');
export const setAutoplayInterval = createAction<number>('setAutoplayInterval');
export const resetWorkpad = createAction<void>('resetWorkpad');

export const initializeWorkpad = createThunk('initializeWorkpad', ({ dispatch }) => {
  dispatch(fetchAllRenderables());
});

export const addColor = createThunk('addColor', ({ dispatch, getState }, color: string) => {
  const colors = getWorkpadColors(getState()).slice(0);
  if (!includes(colors, color)) {
    colors.push(color);
  }
  dispatch(setColors(colors));
});

export const removeColor = createThunk('removeColor', ({ dispatch, getState }, color: string) => {
  dispatch(setColors(without(getWorkpadColors(getState()), color)));
});

export const setWorkpad = createThunk(
  'setWorkpad',
  (
    { dispatch, type },
    workpad: CanvasWorkpad,
    { loadPages = true }: { loadPages?: boolean } = {}
  ) => {
    dispatch(createAction(type)(workpad)); // set the workpad object in state
    if (loadPages) {
      dispatch(initializeWorkpad());
    }
  }
);
