/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';

import {
  removeClusters as sendRemoveClustersRequest,
  showApiError,
} from '../../services';

import {
  REMOVE_CLUSTERS_START,
  REMOVE_CLUSTERS_SUCCESS,
  REMOVE_CLUSTERS_FAILURE,
} from '../action_types';

import { closeDetailPanel } from './detail_panel';
import { refreshClusters } from './refresh_clusters';
import { getDetailPanelClusterName } from '../selectors';

export const removeClusters = (names) => async (dispatch, getState) => {
  dispatch({
    type: REMOVE_CLUSTERS_START,
  });

  try {
    await Promise.all([
      sendRemoveClustersRequest(names),
      // Wait at least half a second to avoid a weird flicker of the saving feedback.
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    dispatch({
      type: REMOVE_CLUSTERS_FAILURE,
      payload: { error }
    });

    return showApiError(error, i18n.translate('xpack.remoteClusters.removeAction.errorTitle', {
      defaultMessage: 'Error removeing remote clusters',
    }));
  }

  if (names.length === 1) {
    toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.removeAction.successSingleNotificationTitle', {
      defaultMessage: `Remote cluster '{name}' was removeed`,
      values: { name: names[0] },
    }));
  } else {
    toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.removeAction.successMultipleNotificationTitle', {
      defaultMessage: '{count} remote clusters were removeed',
      values: { count: names.length },
    }));
  }

  // If we've just deleted a cluster we were looking at, we need to close the panel.
  const detailPanelClusterName = getDetailPanelClusterName(getState());
  if (detailPanelClusterName && names.includes(detailPanelClusterName)) {
    dispatch(closeDetailPanel());
  }

  dispatch({
    type: REMOVE_CLUSTERS_SUCCESS,
  });

  dispatch(refreshClusters());
};
