/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toastNotifications } from 'ui/notify';
import { saveLifecycle as saveLifecycleApi } from '../../api';


export const saveLifecyclePolicy = (lifecycle, isNew) => async () => {
  try {
    await saveLifecycleApi(lifecycle);
  }
  catch (err) {
    toastNotifications.addDanger(err.data.message);
    return false;
  }
  const verb = isNew ? 'created' : 'updated';
  toastNotifications.addSuccess(`Successfully ${verb} lifecycle policy '${lifecycle.name}'`);
  return true;
};
