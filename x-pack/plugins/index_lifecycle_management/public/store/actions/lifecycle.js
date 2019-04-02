/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import {
  UA_POLICY_CREATE,
  UA_POLICY_UPDATE,
} from '../../../common/constants';

import { showApiError } from '../../services/api_errors';
import { saveLifecycle as saveLifecycleApi } from '../../services/api';
import { trackUserAction, getUserActionsForPhases } from '../../services';

export const saveLifecyclePolicy = (lifecycle, isNew) => async () => {
  try {
    await saveLifecycleApi(lifecycle);
  }
  catch (err) {
    const title = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.saveErrorMessage',
      {
        defaultMessage: 'Error saving lifecycle policy {lifecycleName}',
        values: { lifecycleName: lifecycle.name }
      }
    );
    showApiError(err, title);
    return false;
  }

  const userActions = getUserActionsForPhases(lifecycle.phases);
  userActions.push(isNew ? UA_POLICY_CREATE : UA_POLICY_UPDATE);
  trackUserAction(userActions.join(','));

  const message = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.successfulSaveMessage',
    {
      defaultMessage: '{verb} lifecycle policy "{lifecycleName}"',
      values: { verb: isNew ? i18n.translate('xpack.indexLifecycleMgmt.editPolicy.createdMessage', {
        defaultMessage: 'Created',
      }) : i18n.translate('xpack.indexLifecycleMgmt.editPolicy.updatedMessage', {
        defaultMessage: 'Updated',
      }), lifecycleName: lifecycle.name }
    },
  );
  toastNotifications.addSuccess(message);
  return true;
};
