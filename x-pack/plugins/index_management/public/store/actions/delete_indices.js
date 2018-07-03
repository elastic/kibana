/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from "redux-actions";
import { deleteIndices as request } from "../../services";
import { toastNotifications } from 'ui/notify';
import { clearRowStatus } from "../actions";

export const deleteIndicesSuccess = createAction(
  "INDEX_MANAGEMENT_DELETE_INDICES_SUCCESS"
);
export const deleteIndices = ({ indexNames }) => async (dispatch) => {
  try {
    await request(indexNames);
  } catch (error) {
    toastNotifications.addDanger(error.data.message);
    return dispatch(clearRowStatus({ indexNames }));
  }
  toastNotifications.addSuccess(`Successfully deleted: [${indexNames.join(", ")}]`);
  dispatch(deleteIndicesSuccess({ indexNames }));
};
