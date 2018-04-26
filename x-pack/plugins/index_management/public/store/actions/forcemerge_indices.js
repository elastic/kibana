/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from "redux-actions";
import { forcemergeIndices as request } from "../../services";
import { reloadIndices } from "../actions";
import { toastNotifications } from 'ui/notify';

export const forcemergeIndicesStart = createAction(
  "INDEX_MANAGEMENT_FORCEMERGE_INDICES_START"
);

export const forcemergeIndices = ({ indexNames, maxNumSegments }) => async (dispatch) => {
  dispatch(forcemergeIndicesStart({ indexNames }));
  try {
    await request(indexNames, maxNumSegments);
  } catch (error) {
    return toastNotifications.addDanger(error.data.message);
  }
  dispatch(reloadIndices(indexNames));
  toastNotifications.addSuccess(`Successfully force merged: [${indexNames.join(", ")}]`);
};
