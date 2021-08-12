/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { timelineActions } from '../../../../timelines/store/timeline';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
import * as i18nCommon from '../../../../common/translations';
import * as i18n from '../translations';

import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../../common/components/toasters';
import { useStatusBulkActionItems } from '../../../../../../timelines/public';

interface Props {
  alertStatus?: Status;
  closePopover: () => void;
  eventId: string;
  timelineId: string;
  indexName: string;
}

export const useAlertsActions = ({
  alertStatus,
  closePopover,
  eventId,
  timelineId,
  indexName,
}: Props) => {
  const dispatch = useDispatch();
  const [, dispatchToaster] = useStateToaster();

  const { addWarning } = useAppToasts();

  const onAlertStatusUpdateSuccess = useCallback(
    (updated: number, conflicts: number, newStatus: Status) => {
      closePopover();
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
    [addWarning, closePopover, dispatchToaster]
  );

  const onAlertStatusUpdateFailure = useCallback(
    (newStatus: Status, error: Error) => {
      let title: string;
      closePopover();

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
    [closePopover, dispatchToaster]
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

  const actionItems = useStatusBulkActionItems({
    eventIds: [eventId],
    currentStatus: alertStatus,
    indexName,
    setEventsLoading,
    setEventsDeleted,
    onUpdateSuccess: onAlertStatusUpdateSuccess,
    onUpdateFailure: onAlertStatusUpdateFailure,
  });

  return {
    actionItems,
  };
};
