/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from "redux-actions";
import { toastNotifications } from 'ui/notify';
import { clearCacheIndices as request } from "../../services";
import { reloadIndices } from "../actions";

export const clearCacheIndicesStart = createAction(
  "INDEX_MANAGEMENT_CLEAR_CACHE_INDICES_START"
);
export const clearCacheIndices = ({ indexNames }) => async (dispatch) => {
  dispatch(clearCacheIndicesStart({ indexNames }));
  try {
    await request(indexNames);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }
  dispatch(reloadIndices(indexNames));
  toastNotifications.addSuccess(`Successfully cleared cache: [${indexNames.join(", ")}]`);
};
