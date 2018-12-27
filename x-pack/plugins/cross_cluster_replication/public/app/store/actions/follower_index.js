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
  updateFollowerIndex as updateFollowerIndexRequest,
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

export const saveFollowerIndex = (id, followerIndex, isUpdating = false) => (
  sendApiRequest({
    label: isUpdating ? t.FOLLOWER_INDEX_UPDATE : t.FOLLOWER_INDEX_CREATE,
    status: API_STATUS.SAVING,
    scope,
    handler: async () => {
      if (isUpdating) {
        return await updateFollowerIndexRequest(id, followerIndex);
      }
      return await createFollowerIndexRequest({ id, ...followerIndex });
    },
    onSuccess() {
      const successMessage = isUpdating
        ? i18n.translate('xpack.crossClusterReplication.followerIndex.addAction.successMultipleNotificationTitle', {
          defaultMessage: `Auto-follow pattern '{name}' updated successfully`,
          values: { name: id },
        })
        : i18n.translate('xpack.crossClusterReplication.followerIndex.addAction.successSingleNotificationTitle', {
          defaultMessage: `Added auto-follow pattern '{name}'`,
          values: { name: id },
        });

      toastNotifications.addSuccess(successMessage);
      routing.navigate(`/follower_indices`, undefined, {
        pattern: encodeURIComponent(id),
      });
    },
  })
);
