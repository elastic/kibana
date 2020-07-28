/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { select, takeLatest, call } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { GraphState, GraphStoreDependencies } from './store';
import { reset } from './global';
import { setBreadcrumbs } from '../services/url';

const actionCreator = actionCreatorFactory('x-pack/graph/metaData');

export interface MetaDataState {
  title: string;
  description: string;
  savedObjectId?: string;
}

export const updateMetaData = actionCreator<Partial<MetaDataState>>('UPDATE_META_DATA');

const initialMetaData: MetaDataState = {
  title: i18n.translate('xpack.graph.newGraphTitle', {
    defaultMessage: 'Unsaved graph',
  }),
  description: '',
};

export const metaDataReducer = reducerWithInitialState(initialMetaData)
  .case(reset, () => initialMetaData)
  .case(updateMetaData, (oldMetaData, newMetaData) => ({ ...oldMetaData, ...newMetaData }))
  .build();

export const metaDataSelector = (state: GraphState) => state.metaData;

/**
 * Saga updating the breadcrumb when the shown workspace changes.
 */
export const syncBreadcrumbSaga = ({ chrome, changeUrl }: GraphStoreDependencies) => {
  function* syncBreadcrumb() {
    const metaData = metaDataSelector(yield select());
    setBreadcrumbs({
      chrome,
      metaData,
      navigateTo: (path: string) => {
        // TODO this should be wrapped into canWipeWorkspace,
        // but the check is too simple right now. Change this
        // once actual state-diffing is in place.
        changeUrl(path);
      },
    });
  }
  return function* () {
    // initial sync
    yield call(syncBreadcrumb);
    yield takeLatest(updateMetaData.match, syncBreadcrumb);
  };
};
