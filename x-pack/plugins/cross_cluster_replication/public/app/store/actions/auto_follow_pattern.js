/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { getToasts } from '../../services/notifications';
import { SECTIONS, API_STATUS } from '../../constants';
import {
  loadAutoFollowPatterns as loadAutoFollowPatternsRequest,
  getAutoFollowPattern as getAutoFollowPatternRequest,
  createAutoFollowPattern as createAutoFollowPatternRequest,
  updateAutoFollowPattern as updateAutoFollowPatternRequest,
  deleteAutoFollowPattern as deleteAutoFollowPatternRequest,
  pauseAutoFollowPattern as pauseAutoFollowPatternRequest,
  resumeAutoFollowPattern as resumeAutoFollowPatternRequest,
} from '../../services/api';
import { routing } from '../../services/routing';
import * as t from '../action_types';
import { sendApiRequest } from './api';
import { getSelectedAutoFollowPatternId } from '../selectors';

const { AUTO_FOLLOW_PATTERN: scope } = SECTIONS;

export const selectDetailAutoFollowPattern = (id) => ({
  type: t.AUTO_FOLLOW_PATTERN_SELECT_DETAIL,
  payload: id,
});

export const selectEditAutoFollowPattern = (id) => ({
  type: t.AUTO_FOLLOW_PATTERN_SELECT_EDIT,
  payload: id,
});

export const loadAutoFollowPatterns = (isUpdating = false) =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_LOAD,
    scope,
    status: isUpdating ? API_STATUS.UPDATING : API_STATUS.LOADING,
    handler: async () => await loadAutoFollowPatternsRequest(),
  });

export const getAutoFollowPattern = (id) =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_GET,
    scope: `${scope}-get`,
    handler: async () => await getAutoFollowPatternRequest(id),
  });

export const saveAutoFollowPattern = (id, autoFollowPattern, isUpdating = false) =>
  sendApiRequest({
    label: isUpdating ? t.AUTO_FOLLOW_PATTERN_UPDATE : t.AUTO_FOLLOW_PATTERN_CREATE,
    status: API_STATUS.SAVING,
    scope: `${scope}-save`,
    handler: async () => {
      if (isUpdating) {
        return await updateAutoFollowPatternRequest(id, autoFollowPattern);
      }
      return await createAutoFollowPatternRequest({ id, ...autoFollowPattern });
    },
    onSuccess() {
      const successMessage = isUpdating
        ? i18n.translate(
            'xpack.crossClusterReplication.autoFollowPattern.updateAction.successNotificationTitle',
            {
              defaultMessage: `Auto-follow pattern '{name}' updated successfully`,
              values: { name: id },
            }
          )
        : i18n.translate(
            'xpack.crossClusterReplication.autoFollowPattern.addAction.successNotificationTitle',
            {
              defaultMessage: `Added auto-follow pattern '{name}'`,
              values: { name: id },
            }
          );

      getToasts().addSuccess(successMessage);
      routing.navigate(`/auto_follow_patterns`, {
        pattern: encodeURIComponent(id),
      });
    },
  });

export const deleteAutoFollowPattern = (id) =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_DELETE,
    scope: `${scope}-delete`,
    status: API_STATUS.DELETING,
    handler: async () => deleteAutoFollowPatternRequest(id),
    onSuccess(response, dispatch, getState) {
      /**
       * We can have 1 or more auto-follow pattern delete operation
       * that can fail or succeed. We will show 1 toast notification for each.
       */
      if (response.errors.length) {
        const hasMultipleErrors = response.errors.length > 1;
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.removeAction.errorMultipleNotificationTitle',
              {
                defaultMessage: `Error removing {count} auto-follow patterns`,
                values: { count: response.errors.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.removeAction.errorSingleNotificationTitle',
              {
                defaultMessage: `Error removing the '{name}' auto-follow pattern`,
                values: { name: response.errors[0].id },
              }
            );

        getToasts().addDanger(errorMessage);
      }

      if (response.itemsDeleted.length) {
        const hasMultipleDelete = response.itemsDeleted.length > 1;

        const successMessage = hasMultipleDelete
          ? i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.removeAction.successMultipleNotificationTitle',
              {
                defaultMessage: `{count} auto-follow patterns were removed`,
                values: { count: response.itemsDeleted.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.removeAction.successSingleNotificationTitle',
              {
                defaultMessage: `Auto-follow pattern '{name}' was removed`,
                values: { name: response.itemsDeleted[0] },
              }
            );

        getToasts().addSuccess(successMessage);

        // If we've just deleted a pattern we were looking at, we need to close the panel.
        const autoFollowPatternId = getSelectedAutoFollowPatternId('detail')(getState());
        if (response.itemsDeleted.includes(autoFollowPatternId)) {
          dispatch(selectDetailAutoFollowPattern(null));
        }
      }
    },
  });

export const pauseAutoFollowPattern = (id) =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_PAUSE,
    scope: `${scope}-pause`,
    status: API_STATUS.UPDATING,
    handler: () => pauseAutoFollowPatternRequest(id),
    onSuccess: (response) => {
      /**
       * We can have 1 or more auto-follow pattern pause operations
       * that can fail or succeed. We will show 1 toast notification for each.
       */
      if (response.errors.length) {
        const hasMultipleErrors = response.errors.length > 1;
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.pauseAction.errorMultipleNotificationTitle',
              {
                defaultMessage: `Error pausing {count} auto-follow patterns`,
                values: { count: response.errors.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.pauseAction.errorSingleNotificationTitle',
              {
                defaultMessage: `Error pausing the '{name}' auto-follow pattern`,
                values: { name: response.errors[0].id },
              }
            );

        getToasts().addDanger(errorMessage);
      }

      if (response.itemsPaused.length) {
        const hasMultiple = response.itemsPaused.length > 1;

        const successMessage = hasMultiple
          ? i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.pauseAction.successMultipleNotificationTitle',
              {
                defaultMessage: `{count} auto-follow patterns were paused`,
                values: { count: response.itemsPaused.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.pauseAction.successSingleNotificationTitle',
              {
                defaultMessage: `Auto-follow pattern '{name}' was paused`,
                values: { name: response.itemsPaused[0] },
              }
            );

        getToasts().addSuccess(successMessage);
      }
    },
  });

export const resumeAutoFollowPattern = (id) =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_PATTERN_RESUME,
    scope: `${scope}-resume`,
    status: API_STATUS.UPDATING,
    handler: () => resumeAutoFollowPatternRequest(id),
    onSuccess: (response) => {
      /**
       * We can have 1 or more auto-follow pattern resume operations
       * that can fail or succeed. We will show 1 toast notification for each.
       */
      if (response.errors.length) {
        const hasMultipleErrors = response.errors.length > 1;
        const errorMessage = hasMultipleErrors
          ? i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.resumeAction.errorMultipleNotificationTitle',
              {
                defaultMessage: `Error resuming {count} auto-follow patterns`,
                values: { count: response.errors.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.resumeAction.errorSingleNotificationTitle',
              {
                defaultMessage: `Error resuming the '{name}' auto-follow pattern`,
                values: { name: response.errors[0].id },
              }
            );

        getToasts().addDanger(errorMessage);
      }

      if (response.itemsResumed.length) {
        const hasMultiple = response.itemsResumed.length > 1;

        const successMessage = hasMultiple
          ? i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.resumeAction.successMultipleNotificationTitle',
              {
                defaultMessage: `{count} auto-follow patterns were resumed`,
                values: { count: response.itemsResumed.length },
              }
            )
          : i18n.translate(
              'xpack.crossClusterReplication.autoFollowPattern.resumeAction.successSingleNotificationTitle',
              {
                defaultMessage: `Auto-follow pattern '{name}' was resumed`,
                values: { name: response.itemsResumed[0] },
              }
            );

        getToasts().addSuccess(successMessage);
      }
    },
  });
