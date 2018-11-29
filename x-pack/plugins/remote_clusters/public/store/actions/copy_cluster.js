/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { fatalError, toastNotifications } from 'ui/notify';
import { CRUD_APP_BASE_PATH } from '../../constants';
import { loadClusters } from './load_clusters';

import {
  editCluster as sendEditClusterRequest,
  getRouter,
} from '../../services';

import {
  EDIT_CLUSTER_SAVE,
  EDIT_CLUSTER_SUCCESS,
  EDIT_CLUSTER_FAILURE,
} from '../action_types';

export const copyCluster = (cluster) => async (dispatch) => {
  dispatch({
    type: EDIT_CLUSTER_SAVE,
  });

  try {
    await Promise.all([
      sendEditClusterRequest(cluster),
      // Wait at least half a second to avoid a weird flicker of the saving feedback.
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    if (error) {
      const { statusCode, data } = error;

      // Expect an error in the shape provided by Angular's $http service.
      if (data) {
        return dispatch({
          type: EDIT_CLUSTER_FAILURE,
          payload: {
            error: {
              message: i18n.translate('xpack.remoteClusters.redefineAction.failedDefaultErrorMessage', {
                defaultMessage: 'Request failed with a {statusCode} error. {message}',
                values: { statusCode, message: data.message },
              }),
              cause: data.cause,
            },
          },
        });
      }
    }

    // This error isn't an HTTP error, so let the fatal error screen tell the user something
    // unexpected happened.
    return fatalError(error, i18n.translate('xpack.remoteClusters.redefineAction.errorTitle', {
      defaultMessage: 'Error copying cluster',
    }));
  }

  toastNotifications.addSuccess(i18n.translate('xpack.remoteClusters.redefineAction.successTitle', {
    defaultMessage: `Created persistent copy of '{name}'`,
    values: { name: cluster.name },
  }));

  dispatch({
    type: EDIT_CLUSTER_SUCCESS,
  });

  dispatch(loadClusters());

  // This will open the new job in the detail panel. Note that we're *not* showing a success toast
  // here, because it would partially obscure the detail panel.
  getRouter().history.push({
    pathname: `${CRUD_APP_BASE_PATH}/list`,
    search: `?cluster=${cluster.name}`,
  });
};
