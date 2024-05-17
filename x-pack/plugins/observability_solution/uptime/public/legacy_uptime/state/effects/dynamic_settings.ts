/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Action } from 'redux-actions';
import { call, put, takeLatest, takeLeading } from 'redux-saga/effects';
import { DynamicSettings } from '../../../../common/runtime_types';
import {
  getDynamicSettings,
  getDynamicSettingsFail,
  getDynamicSettingsSuccess,
  setDynamicSettings,
  setDynamicSettingsFail,
  setDynamicSettingsSuccess,
} from '../actions/dynamic_settings';
import {
  getDynamicSettings as getDynamicSettingsAPI,
  setDynamicSettings as setDynamicSettingsAPI,
} from '../api';
import { kibanaService } from '../kibana_service';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchDynamicSettingsEffect() {
  yield takeLeading(
    String(getDynamicSettings),
    fetchEffectFactory(getDynamicSettingsAPI, getDynamicSettingsSuccess, getDynamicSettingsFail)
  );
}

export function* setDynamicSettingsEffect() {
  const couldNotSaveSettingsText = i18n.translate('xpack.uptime.settings.error.couldNotSave', {
    defaultMessage: 'Could not save settings!',
  });
  yield takeLatest(String(setDynamicSettings), function* (action: Action<DynamicSettings>) {
    try {
      if (!action.payload) {
        const err = new Error('Cannot fetch effect without a payload');
        yield put(setDynamicSettingsFail(err));

        kibanaService.core.notifications.toasts.addError(err, {
          title: couldNotSaveSettingsText,
        });
        return;
      }
      yield call(setDynamicSettingsAPI, { settings: action.payload });
      yield put(setDynamicSettingsSuccess(action.payload));
      kibanaService.core.notifications.toasts.addSuccess(
        i18n.translate('xpack.uptime.settings.saveSuccess', {
          defaultMessage: 'Settings saved!',
        })
      );
    } catch (err) {
      kibanaService.core.notifications.toasts.addError(err, {
        title: couldNotSaveSettingsText,
      });
      yield put(setDynamicSettingsFail(err));
    }
  });
}
