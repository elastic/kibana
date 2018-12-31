/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import routing from '../../services/routing';
import { SECTIONS, API_STATUS } from '../../constants';
import {
  loadFollowerIndices as loadFollowerIndicesRequest,
  getFollowerIndex as getFollowerIndexRequest,
  createFollowerIndex as createFollowerIndexRequest,
} from '../../services/api';
import * as t from '../action_types';
import { sendApiRequest } from './api';

const { FOLLOWER_INDEX: scope } = SECTIONS;

export const selectDetailFollowerIndex = (id) => ({
  type: t.FOLLOWER_INDEX_SELECT_DETAIL,
  payload: id
});

export const loadFollowerIndices = (isUpdating = false) =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_LOAD,
    scope,
    status: isUpdating ? API_STATUS.UPDATING : API_STATUS.LOADING,
    handler: async () => (
      await loadFollowerIndicesRequest()
    ),
  });

export const getFollowerIndex = (id) =>
  sendApiRequest({
    label: t.FOLLOWER_INDEX_GET,
    scope,
    handler: async () => (
      await getFollowerIndexRequest(id)
    )
  });

export const saveFollowerIndex = (name, followerIndex) => (
  sendApiRequest({
    label: t.FOLLOWER_INDEX_CREATE,
    status: API_STATUS.SAVING,
    scope,
    handler: async () => (
      await createFollowerIndexRequest({ name, ...followerIndex })
    ),
    onSuccess() {
      const successMessage = i18n.translate('xpack.crossClusterReplication.followerIndex.addAction.successNotificationTitle', {
        defaultMessage: `Added follower index '{name}'`,
        values: { name },
      });

      toastNotifications.addSuccess(successMessage);
      routing.navigate(`/follower_indices`, undefined, {
        pattern: encodeURIComponent(name),
      });
    },
  })
);
