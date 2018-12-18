/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { SECTIONS, API_STATUS } from '../../constants';
import {
  loadAutoFollowPatterns as loadAutoFollowPatternsRequest,
  getAutoFollowPattern as getAutoFollowPatternRequest,
  createAutoFollowPattern as createAutoFollowPatternRequest,
  updateAutoFollowPattern as updateAutoFollowPatternRequest,
  deleteAutoFollowPattern as deleteAutoFollowPatternRequest,
} from '../../services/api';
import routing from '../../services/routing';
import * as t from '../action_types';
import { sendApiRequest } from './api';
import { getDetailPanelAutoFollowPatternName } from '../selectors';

const { AUTO_FOLLOW_PATTERN: scope } = SECTIONS;

export const editAutoFollowPattern = (name) => ({
  type: t.AUTO_FOLLOW_PATTERN_EDIT,
  payload: name
});

export const openAutoFollowPatternDetailPanel = (name) => {
  return {
    type: t.AUTO_FOLLOW_PATTERN_DETAIL_PANEL,
    payload: name
  };
};

export const closeAutoFollowPatternDetailPanel = () => ({
  type: t.AUTO_FOLLOW_PATTERN_DETAIL_PANEL,
  payload: null
});

export const loadAutoFollowPatterns = (isUpdating = false) =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_LOAD,
    scope,
    status: isUpdating ? API_STATUS.UPDATING : API_STATUS.LOADING,
    handler: async () => {
      return await loadAutoFollowPatternsRequest();
    },
  });

export const getAutoFollowPattern = (id) =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_GET,
    scope,
    handler: async (dispatch) => (
      getAutoFollowPatternRequest(id)
        .then((response) => {
          dispatch(editAutoFollowPattern(id));
          return response;
        })
    )
  });

export const saveAutoFollowPattern = (id, autoFollowPattern, isUpdating = false) => (
  sendApiRequest({
    label: isUpdating ? t.AUTO_FOLLOW_PATTERN_UPDATE : t.AUTO_FOLLOW_PATTERN_CREATE,
    status: API_STATUS.SAVING,
    scope,
    handler: async () => {
      if (isUpdating) {
        return await updateAutoFollowPatternRequest(id, autoFollowPattern);
      }
      return await createAutoFollowPatternRequest({ id, ...autoFollowPattern });
    },
    onSuccess() {
      const successMessage = isUpdating
        ? i18n.translate('xpack.crossClusterReplication.autoFollowPattern.addAction.successMultipleNotificationTitle', {
          defaultMessage: `Auto-follow pattern '{name}' updated successfully`,
          values: { name: id },
        })
        : i18n.translate('xpack.crossClusterReplication.autoFollowPattern.addAction.successSingleNotificationTitle', {
          defaultMessage: `Added auto-follow pattern '{name}'`,
          values: { name: id },
        });

      toastNotifications.addSuccess(successMessage);
      routing.navigate(`/auto_follow_patterns`, undefined, {
        pattern: encodeURIComponent(id),
      });
    },
  })
);

export const deleteAutoFollowPattern = (id) => (
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_DELETE,
    scope: `${scope}-delete`,
    status: API_STATUS.DELETING,
    handler: async () => (
      deleteAutoFollowPatternRequest(id)
    ),
    onSuccess(response, dispatch, getState) {
      /**
       * We can have 1 or more auto-follow pattern delete operation
       * that can fail or succeed. We will show 1 toast notification for each.
       */
      if (response.errors.length) {
        const hasMultipleErrors = response.errors.length > 1;
        const errorMessage = hasMultipleErrors
          ? i18n.translate('xpack.crossClusterReplication.autoFollowPattern.removeAction.errorMultipleNotificationTitle', {
            defaultMessage: `Error removing {count} auto-follow patterns`,
            values: { count: response.errors.length },
          })
          : i18n.translate('xpack.crossClusterReplication.autoFollowPattern.removeAction.errorSingleNotificationTitle', {
            defaultMessage: `Error removing the '{name}' auto-follow pattern`,
            values: { name: response.errors[0].id },
          });

        toastNotifications.addDanger(errorMessage);
      }

      if (response.itemsDeleted.length) {
        const hasMultipleDelete = response.itemsDeleted.length > 1;

        const successMessage = hasMultipleDelete
          ? i18n.translate('xpack.crossClusterReplication.autoFollowPattern.removeAction.successMultipleNotificationTitle', {
            defaultMessage: `{count} auto-follow patterns were removed`,
            values: { count: response.itemsDeleted.length },
          })
          : i18n.translate('xpack.crossClusterReplication.autoFollowPattern.removeAction.successSingleNotificationTitle', {
            defaultMessage: `Auto-follow pattern '{name}' was removed`,
            values: { name: response.itemsDeleted[0] },
          });

        toastNotifications.addSuccess(successMessage);
      }

      // If we've just deleted a pattern we were looking at, we need to close the panel.
      const detailPanelAutoFollowPatternName = getDetailPanelAutoFollowPatternName(getState());
      if (detailPanelAutoFollowPatternName && response.itemsDeleted.includes(detailPanelAutoFollowPatternName)) {
        dispatch(closeAutoFollowPatternDetailPanel());
      }
    }
  })
);
