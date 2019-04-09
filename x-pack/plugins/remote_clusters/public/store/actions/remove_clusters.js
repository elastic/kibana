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

function getErrorTitle(count, name = null) {
  if (count === 1) {
    if (name) {
      return i18n.translate('xpack.remoteClusters.removeAction.errorSingleNotificationTitle', {
        defaultMessage: `Error removing remote cluster '{name}'`,
        values: { name },
      });
    }
  } else {
    return i18n.translate('xpack.remoteClusters.removeAction.errorMultipleNotificationTitle', {
      defaultMessage: `Error removing '{count}' remote clusters`,
      values: { count },
    });
  }
}

export const removeClusters = (names) => async (dispatch, getState) => {
  dispatch({
    type: REMOVE_CLUSTERS_START,
  });

  let itemsDeleted = [];
  let errors = [];

  await Promise.all([
    sendRemoveClusterRequest(names.join(','))
      .then((response) => {
        ({ itemsDeleted, errors } = response.data);
      }),
    // Wait at least half a second to avoid a weird flicker of the saving feedback (only visible
    // when requests resolve very quickly).
    new Promise(resolve => setTimeout(resolve, 500)),
  ]).catch(error => {
    const errorTitle = getErrorTitle(names.length, names[0]);
    toastNotifications.addDanger({
      title: errorTitle,
      text: error.data.message,
    });
  });

  if (errors.length > 0) {
    const {
      name,
      error: {
        output: {
          payload: {
            message,
          },
        },
      },
    } = errors[0];

    const title = getErrorTitle(errors.length, name);
    toastNotifications.addDanger({
      title,
      text: message,
    });
  }

  if (itemsDeleted.length > 0) {
    if (itemsDeleted.length === 1) {
      toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.removeAction.successSingleNotificationTitle', {
        defaultMessage: `Remote cluster '{name}' was removed`,
        values: { name: itemsDeleted[0] },
      }));
    } else {
      toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.removeAction.successMultipleNotificationTitle', {
        defaultMessage: '{count} remote clusters were removed',
        values: { count: itemsDeleted.length },
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
    payload: itemsDeleted,
  });
};
