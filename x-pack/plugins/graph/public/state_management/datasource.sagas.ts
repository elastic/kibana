/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest, put, call, select } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { Action } from 'typescript-fsa';
import { GraphStoreDependencies } from './store';
import { loadFields } from './fields';
import { mapFields } from '../services/persistence';
import { settingsSelector } from './advanced_settings';
import {
  IndexpatternDatasource,
  datasourceLoaded,
  setDatasource,
  requestDatasource,
} from './datasource';
import type { DataView } from '../../../../../src/plugins/data_views/public';

/**
 * Saga loading field information when the datasource is switched. This will overwrite current settings
 * in fields.
 *
 * TODO: Carry over fields than can be carried over because they also exist in the target index pattern
 */
export const datasourceSaga = ({
  indexPatternProvider,
  notifications,
  createWorkspace,
  notifyReact,
}: GraphStoreDependencies) => {
  function* fetchFields(action: Action<IndexpatternDatasource>) {
    try {
      const indexPattern: DataView = yield call(indexPatternProvider.get, action.payload.id);
      yield put(loadFields(mapFields(indexPattern)));
      yield put(datasourceLoaded());
      const advancedSettings = settingsSelector(yield select());
      createWorkspace(indexPattern.title, advancedSettings);
      notifyReact();
    } catch (e) {
      // in case of errors, reset the datasource and show notification
      yield put(setDatasource({ type: 'none' }));
      notifications.toasts.addDanger(
        i18n.translate('xpack.graph.loadWorkspace.missingDataViewErrorMessage', {
          defaultMessage: 'Data view "{name}" not found',
          values: {
            name: action.payload.title,
          },
        })
      );
    }
  }

  return function* () {
    yield takeLatest(requestDatasource.match, fetchFields);
  };
};
