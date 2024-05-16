/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

import { ensurePatternFormat } from '../../../../common/utils/sourcerer';
import { isExperimentalSourcererEnabled } from '../is_enabled';
import {
  init,
  selectDataView,
  setDataViewData as setDataViewSpec,
  setPatternList,
} from './actions';
import { type ListenerOptions } from './store';

/**
 * This is the proposed way of handling side effects within sourcerer code. We will no longer rely on useEffect for doing things like
 * enriching the store with data fetched asynchronously in response to user doing something.
 * Thunks are also considered for simpler flows but this has the advantage of cancellation support through `listnerApi` below.
 */

export type ListenerCreator<TDependencies> = (
  // Only specify a subset of required services here, so that it is easier to mock and therefore test the listener
  dependencies: TDependencies
) => ListenerOptions;

// NOTE: this should only be executed once in the application lifecycle, to LAZILY setup the component data
export const createInitDataviewListener: ListenerCreator<{}> = (): ListenerOptions => {
  return {
    actionCreator: init,
    effect: async (action, listenerApi) => {
      // WARN:  Skip the init call if the experimental implementation is disabled
      if (!isExperimentalSourcererEnabled()) {
        return;
      }
      // NOTE: We should only run this once, when particular sourcerer instance is in pristine state (not touched by the user)
      if (listenerApi.getState().state !== 'pristine') {
        return;
      }

      // NOTE: dispatch the regular change listener
      listenerApi.dispatch(selectDataView(action.payload));
    },
  };
};

// NOTE: this listener is executed whenever user decides to select dataview from the picker
export const createChangeDataviewListener: ListenerCreator<{
  dataViewsService: DataViewsServicePublic;
}> = ({ dataViewsService }): ListenerOptions => {
  return {
    actionCreator: selectDataView,
    effect: async (action, listenerApi) => {
      const dataViewId = action.payload;
      const refreshFields = false;

      const dataView = await dataViewsService.get(dataViewId, true, refreshFields);
      const dataViewData = dataView.toSpec();
      listenerApi.dispatch(setDataViewSpec(dataViewData));

      const defaultPatternsList = ensurePatternFormat(dataView.getIndexPattern().split(','));
      const patternList = await dataViewsService.getExistingIndices(defaultPatternsList);
      listenerApi.dispatch(setPatternList(patternList));
    },
  };
};
