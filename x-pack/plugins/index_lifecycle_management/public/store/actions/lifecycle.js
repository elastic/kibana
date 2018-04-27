/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { saveLifecycle as saveLifecycleApi } from '../../api';


export const savedLifecycle = createAction('SAVED_LIFECYCLE');
export const saveLifecycle = (lifecycle, indexTemplatePatch) => async dispatch => {
  let saved;
  try {
    saved = await saveLifecycleApi(lifecycle, indexTemplatePatch);
  }
  catch (err) {
    return toastNotifications.addDanger(err.data.message);
  }

  toastNotifications.addSuccess(`Successfully created lifecycle policy '${lifecycle.name}'`);

  dispatch(savedLifecycle(saved));
};
