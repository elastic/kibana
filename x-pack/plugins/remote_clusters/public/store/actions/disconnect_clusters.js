/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import {
  disconnectClusters as sendDisconnectClustersRequest,
  showApiError,
} from '../../services';

import {
  DISCONNECT_CLUSTERS_START,
  DISCONNECT_CLUSTERS_SUCCESS,
  DISCONNECT_CLUSTERS_FAILURE,
} from '../action_types';

import { closeDetailPanel } from './detail_panel';
import { refreshClusters } from './refresh_clusters';
import { getDetailPanelClusterName } from '../selectors';

export const disconnectClusters = (names) => async (dispatch, getState) => {
  dispatch({
    type: DISCONNECT_CLUSTERS_START,
  });

  try {
    await Promise.all([
      sendDisconnectClustersRequest(names),
      // Wait at least half a second to avoid a weird flicker of the saving feedback.
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    dispatch({
      type: DISCONNECT_CLUSTERS_FAILURE,
      payload: { error }
    });

    return showApiError(error, i18n.translate('xpack.remoteClusters.disconnectAction.errorTitle', {
      defaultMessage: 'Error disconnecting remote clusters',
    }));
  }

  if (names.length === 1) {
    toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.disconnectAction.successSingleNotificationTitle', {
      defaultMessage: `Remote cluster '{name}' was disconnected`,
      values: { name: names[0] },
    }));
  } else {
    toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.disconnectAction.successMultipleNotificationTitle', {
      defaultMessage: '{count} remote clusters were disconnected',
      values: { count: names.length },
    }));
  }

  // If we've just deleted a job we were looking at, we need to close the panel.
  const detailPanelClusterName = getDetailPanelClusterName(getState());
  if (detailPanelClusterName && names.includes(detailPanelClusterName)) {
    dispatch(closeDetailPanel());
  }

  dispatch({
    type: DISCONNECT_CLUSTERS_SUCCESS,
  });

  dispatch(refreshClusters());
};
