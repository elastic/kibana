/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import {
  removeClusterRequest as sendRemoveClusterRequest,
} from '../../services';

import {
  REMOVE_CLUSTERS_START,
  REMOVE_CLUSTERS_FINISH,
} from '../action_types';

import { closeDetailPanel } from './detail_panel';
import { getDetailPanelClusterName } from '../selectors';

export const removeClusters = (names) => async (dispatch, getState) => {
  dispatch({
    type: REMOVE_CLUSTERS_START,
  });

  let removalSuccesses;
  let removalErrors;

  await Promise.all([
    sendRemoveClusterRequest(names.join(','))
      .then((response) => {
        const { itemsDeleted, errors } = response.data;
        removalSuccesses = itemsDeleted;
        removalErrors = errors;
      }),
    // Wait at least half a second to avoid a weird flicker of the saving feedback.
    new Promise(resolve => setTimeout(resolve, 500)),
  ]);

  if (removalErrors.length > 0) {
    if (removalErrors.length === 1) {
      toastNotifications.addDanger(i18n.translate('xpack.remoteClusters.removeAction.errorSingleNotificationTitle', {
        defaultMessage: `Error removing remote cluster '{name}'`,
        values: { name: removalErrors[0].name },
      }));
    } else {
      toastNotifications.addDanger(i18n.translate('xpack.remoteClusters.removeAction.errorMultipleNotificationTitle', {
        defaultMessage: `Error removing '{count}' remote clusters`,
        values: { count: removalErrors.length },
      }));
    }
  }

  if (removalSuccesses.length > 0) {
    if (removalSuccesses.length === 1) {
      toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.removeAction.successSingleNotificationTitle', {
        defaultMessage: `Remote cluster '{name}' was removed`,
        values: { name: removalSuccesses[0] },
      }));
    } else {
      toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.removeAction.successMultipleNotificationTitle', {
        defaultMessage: '{count} remote clusters were removed',
        values: { count: removalSuccesses.length },
      }));
    }
  }

  // If we've just deleted a cluster we were looking at, we need to close the panel.
  const detailPanelClusterName = getDetailPanelClusterName(getState());
  if (detailPanelClusterName && names.includes(detailPanelClusterName)) {
    dispatch(closeDetailPanel());
  }

  dispatch({
    type: REMOVE_CLUSTERS_FINISH,
    // Send the cluster that have been removed to the reducers
    // and update the store immediately without the need to re-fetch from the server
    payload: removalSuccesses,
  });
};
