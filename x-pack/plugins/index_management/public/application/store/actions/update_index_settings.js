/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { updateIndexSettings as request } from '../../services';
import { reloadIndices } from './reload_indices';
import { notificationService } from '../../services/notification';

export const updateIndexSettingsSuccess = createAction(
  'INDEX_MANAGEMENT_UPDATE_INDEX_SETTINGS_SUCCESS'
);
export const updateIndexSettingsError = createAction(
  'INDEX_MANAGEMENT_UPDATE_INDEX_SETTINGS_ERROR'
);

export const updateIndexSettings =
  ({ indexName, settings }) =>
  async (dispatch) => {
    if (Object.keys(settings).length !== 0) {
      const { error } = await request(indexName, settings);

      if (error) {
        return dispatch(updateIndexSettingsError({ error: error.message }));
      }
    }
    dispatch(updateIndexSettingsSuccess());
    dispatch(reloadIndices([indexName]));
    notificationService.showSuccessToast(
      i18n.translate('xpack.idxMgmt.updateIndexSettingsAction.settingsSuccessUpdateMessage', {
        defaultMessage: 'Successfully updated settings for index {indexName}',
        values: { indexName },
      })
    );
  };
