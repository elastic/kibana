/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from "redux-actions";

import { refreshIndices as request } from "../../services";
import { reloadIndices } from "../actions";
import { toastNotifications } from 'ui/notify';

export const refreshIndicesStart = createAction(
  "INDEX_MANAGEMENT_REFRESH_INDICES_START"
);
export const refreshIndices = ({ indexNames }) => async (dispatch) => {
  dispatch(refreshIndicesStart({ indexNames }));
  try {
    await request(indexNames);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }
  dispatch(reloadIndices(indexNames));
  toastNotifications.addSuccess(`Successfully refreshed: [${indexNames.join(", ")}]`);
};
