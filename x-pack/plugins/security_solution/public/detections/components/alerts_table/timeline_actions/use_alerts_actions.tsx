/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { timelineActions } from '../../../../timelines/store/timeline';
import { FILTER_OPEN, FILTER_CLOSED, FILTER_IN_PROGRESS } from '../alerts_filter_group';
import { updateAlertStatusAction } from '../actions';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
import * as i18nCommon from '../../../../common/translations';
import * as i18n from '../translations';

import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../../common/components/toasters';
import { useUserData } from '../../user_info';

interface Props {
  alertStatus?: string;
  closePopover: () => void;
  eventId: string | null | undefined;
  timelineId: string;
}

export const useAlertsActions = ({ alertStatus, closePopover, eventId, timelineId }: Props) => {
  const dispatch = useDispatch();
  const [, dispatchToaster] = useStateToaster();

  const { addWarning } = useAppToasts();

  const [{ canUserCRUD, hasIndexMaintenance, hasIndexUpdateDelete }] = useUserData();

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: Status) => {
      if (conflicts > 0) {
        // Partial failure
        addWarning({
          title: i18nCommon.UPDATE_ALERT_STATUS_FAILED(conflicts),
          text: i18nCommon.UPDATE_ALERT_STATUS_FAILED_DETAILED(updated, conflicts),
        });
      } else {
        let title: string;
        switch (newStatus) {
          case 'closed':
            title = i18n.CLOSED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'open':
            title = i18n.OPENED_ALERT_SUCCESS_TOAST(updated);
            break;
          case 'in-progress':
            title = i18n.IN_PROGRESS_ALERT_SUCCESS_TOAST(updated);
        }

        displaySuccessToast(title, dispatchToaster);
      }
    },
    [addWarning, dispatchToaster]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (newStatus: Status, error: Error) => {
      let title: string;
      switch (newStatus) {
        case 'closed':
          title = i18n.CLOSED_ALERT_FAILED_TOAST;
          break;
        case 'open':
          title = i18n.OPENED_ALERT_FAILED_TOAST;
          break;
        case 'in-progress':
          title = i18n.IN_PROGRESS_ALERT_FAILED_TOAST;
      }
      displayErrorToast(title, [error.message], dispatchToaster);
    },
    [dispatchToaster]
  );

  const setEventsLoading = useCallback(
    ({ eventIds, isLoading }: SetEventsLoadingProps) => {
      dispatch(timelineActions.setEventsLoading({ id: timelineId, eventIds, isLoading }));
    },
    [dispatch, timelineId]
  );

  const setEventsDeleted = useCallback(
    ({ eventIds, isDeleted }: SetEventsDeletedProps) => {
      dispatch(timelineActions.setEventsDeleted({ id: timelineId, eventIds, isDeleted }));
    },
    [dispatch, timelineId]
  );

  const openAlertActionOnClick = useCallback(() => {
    if (eventId) {
      updateAlertStatusAction({
        alertIds: [eventId],
        onAlertStatusUpdateFailure,
        onAlertStatusUpdateSuccess,
        setEventsDeleted,
        setEventsLoading,
        selectedStatus: FILTER_OPEN,
      });
    }
    closePopover();
  }, [
    closePopover,
    eventId,
    onAlertStatusUpdateFailure,
    onAlertStatusUpdateSuccess,
    setEventsDeleted,
    setEventsLoading,
  ]);

  const closeAlertActionClick = useCallback(() => {
    if (eventId) {
      updateAlertStatusAction({
        alertIds: [eventId],
        onAlertStatusUpdateFailure,
        onAlertStatusUpdateSuccess,
        setEventsDeleted,
        setEventsLoading,
        selectedStatus: FILTER_CLOSED,
      });
    }

    closePopover();
  }, [
    closePopover,
    eventId,
    onAlertStatusUpdateFailure,
    onAlertStatusUpdateSuccess,
    setEventsDeleted,
    setEventsLoading,
  ]);

  const inProgressAlertActionClick = useCallback(() => {
    if (eventId) {
      updateAlertStatusAction({
        alertIds: [eventId],
        onAlertStatusUpdateFailure,
        onAlertStatusUpdateSuccess,
        setEventsDeleted,
        setEventsLoading,
        selectedStatus: FILTER_IN_PROGRESS,
      });
    }

    closePopover();
  }, [
    closePopover,
    eventId,
    onAlertStatusUpdateFailure,
    onAlertStatusUpdateSuccess,
    setEventsDeleted,
    setEventsLoading,
  ]);

  const disabledInProgressAlertAction = !canUserCRUD || !hasIndexUpdateDelete;

  const inProgressAlertAction = useMemo(() => {
    return {
      name: i18n.ACTION_IN_PROGRESS_ALERT,
      disabled: disabledInProgressAlertAction,
      onClick: inProgressAlertActionClick,
      [`data-test-subj`]: 'in-progress-alert-status',
    };
  }, [disabledInProgressAlertAction, inProgressAlertActionClick]);

  const disabledCloseAlertAction = !hasIndexUpdateDelete && !hasIndexMaintenance;
  const closeAlertAction = useMemo(() => {
    return {
      name: i18n.ACTION_CLOSE_ALERT,
      disabled: disabledCloseAlertAction,
      onClick: closeAlertActionClick,
      [`data-test-subj`]: 'close-alert-status',
    };
  }, [disabledCloseAlertAction, closeAlertActionClick]);

  const disabledOpenAlertAction = !hasIndexUpdateDelete && !hasIndexMaintenance;
  const openAlertAction = useMemo(() => {
    return {
      name: i18n.ACTION_OPEN_ALERT,
      disabled: disabledOpenAlertAction,
      onClick: openAlertActionOnClick,
      [`data-test-subj`]: 'open-alert-status',
    };
  }, [disabledOpenAlertAction, openAlertActionOnClick]);

  const statusActions = useMemo(() => {
    if (!alertStatus) {
      return [];
    }

    switch (alertStatus) {
      case 'open':
        return [inProgressAlertAction, closeAlertAction];
      case 'in-progress':
        return [openAlertAction, closeAlertAction];
      case 'closed':
        return [openAlertAction, inProgressAlertAction];
      default:
        return [];
    }
  }, [alertStatus, inProgressAlertAction, closeAlertAction, openAlertAction]);

  return {
    statusActions,
  };
};
