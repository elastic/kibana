/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadIndexSettings as request } from "../../services";
import { loadIndexDataSuccess } from './load_index_data';
import { toastNotifications } from 'ui/notify';

export const editIndexSettings = ({ indexName }) => async (dispatch) => {
  let indexSettings;
  try {
    indexSettings = await request(indexName);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }
  toastNotifications.addSuccess(`Successfully saved settings for ${indexName}`);
  dispatch(
    loadIndexDataSuccess({
      data: indexSettings,
      panelType: 'editIndexSettings',
      indexName
    })
  );
};
