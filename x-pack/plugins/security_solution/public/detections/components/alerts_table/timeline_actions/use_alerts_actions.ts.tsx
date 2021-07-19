/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { EuiContextMenuItem, EuiText } from '@elastic/eui';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { getOr } from 'lodash/fp';
import { indexOf } from 'lodash';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { timelineActions } from '../../../../timelines/store/timeline';
import { FILTER_OPEN, FILTER_CLOSED, FILTER_IN_PROGRESS } from '../alerts_filter_group';
import { updateAlertStatusAction } from '../actions';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
import { Ecs } from '../../../../../common/ecs';
import * as i18nCommon from '../../../../common/translations';
import * as i18n from '../translations';

import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../../common/components/toasters';
import { useUserData } from '../../user_info';

interface Props {
  ecsRowData: Ecs;
  timelineId: string;
  closePopover: () => void;
  handleOpenExceptionModal: (exceptionListType: ExceptionListType) => void;
  openAddEventFilterModal: (isModalOpened: boolean) => void;
}

export const useAlertsActions = ({
  closePopover,
  ecsRowData,
  timelineId,
  handleOpenExceptionModal,
  openAddEventFilterModal,
}: Props) => {
  const dispatch = useDispatch();
  const [, dispatchToaster] = useStateToaster();
  const eventId = ecsRowData._id;
  const ruleId = useMemo(
    (): string | null =>
      (ecsRowData.signal?.rule && ecsRowData.signal.rule.id && ecsRowData.signal.rule.id[0]) ??
      null,
    [ecsRowData]
  );

  const isEvent = useMemo(() => indexOf(ecsRowData.event?.kind, 'event') !== -1, [ecsRowData]);

  const { addWarning } = useAppToasts();

  const alertStatus = useMemo(() => {
    return ecsRowData.signal?.status && (ecsRowData.signal.status[0] as Status);
  }, [ecsRowData]);

  const [{ canUserCRUD, hasIndexWrite, hasIndexMaintenance, hasIndexUpdateDelete }] = useUserData();

  const isEndpointAlert = useMemo((): boolean => {
    if (ecsRowData == null) {
      return false;
    }

    const eventModules = getOr([], 'signal.original_event.module', ecsRowData);
    const kinds = getOr([], 'signal.original_event.kind', ecsRowData);

    return eventModules.includes('endpoint') && kinds.includes('alert');
  }, [ecsRowData]);

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
    updateAlertStatusAction({
      alertIds: [eventId],
      onAlertStatusUpdateFailure,
      onAlertStatusUpdateSuccess,
      setEventsDeleted,
      setEventsLoading,
      selectedStatus: FILTER_OPEN,
    });
    closePopover();
  }, [
    closePopover,
    eventId,
    onAlertStatusUpdateFailure,
    onAlertStatusUpdateSuccess,
    setEventsDeleted,
    setEventsLoading,
  ]);

  const openAlertActionComponent = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="open-alert"
        aria-label="Open alert"
        data-test-subj="open-alert-status"
        id={FILTER_OPEN}
        onClick={openAlertActionOnClick}
        disabled={!hasIndexUpdateDelete && !hasIndexMaintenance}
      >
        <EuiText size="m">{i18n.ACTION_OPEN_ALERT}</EuiText>
      </EuiContextMenuItem>
    );
  }, [openAlertActionOnClick, hasIndexUpdateDelete, hasIndexMaintenance]);

  const closeAlertActionClick = useCallback(() => {
    updateAlertStatusAction({
      alertIds: [eventId],
      onAlertStatusUpdateFailure,
      onAlertStatusUpdateSuccess,
      setEventsDeleted,
      setEventsLoading,
      selectedStatus: FILTER_CLOSED,
    });
    closePopover();
  }, [
    closePopover,
    eventId,
    onAlertStatusUpdateFailure,
    onAlertStatusUpdateSuccess,
    setEventsDeleted,
    setEventsLoading,
  ]);

  const closeAlertActionComponent = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="close-alert"
        aria-label="Close alert"
        data-test-subj="close-alert-status"
        id={FILTER_CLOSED}
        onClick={closeAlertActionClick}
        disabled={!hasIndexUpdateDelete && !hasIndexMaintenance}
      >
        <EuiText size="m">{i18n.ACTION_CLOSE_ALERT}</EuiText>
      </EuiContextMenuItem>
    );
  }, [closeAlertActionClick, hasIndexUpdateDelete, hasIndexMaintenance]);

  const inProgressAlertActionClick = useCallback(() => {
    updateAlertStatusAction({
      alertIds: [eventId],
      onAlertStatusUpdateFailure,
      onAlertStatusUpdateSuccess,
      setEventsDeleted,
      setEventsLoading,
      selectedStatus: FILTER_IN_PROGRESS,
    });
    closePopover();
  }, [
    closePopover,
    eventId,
    onAlertStatusUpdateFailure,
    onAlertStatusUpdateSuccess,
    setEventsDeleted,
    setEventsLoading,
  ]);

  const inProgressAlertActionComponent = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="in-progress-alert"
        aria-label="Mark alert in progress"
        data-test-subj="in-progress-alert-status"
        id={FILTER_IN_PROGRESS}
        onClick={inProgressAlertActionClick}
        disabled={!canUserCRUD || !hasIndexUpdateDelete}
      >
        <EuiText size="m">{i18n.ACTION_IN_PROGRESS_ALERT}</EuiText>
      </EuiContextMenuItem>
    );
  }, [canUserCRUD, hasIndexUpdateDelete, inProgressAlertActionClick]);

  const handleAddEndpointExceptionClick = useCallback((): void => {
    closePopover();
    handleOpenExceptionModal('endpoint');
  }, [closePopover, handleOpenExceptionModal]);

  const addEndpointExceptionComponent = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="add-endpoint-exception-menu-item"
        aria-label="Add Endpoint Exception"
        data-test-subj="add-endpoint-exception-menu-item"
        id="addEndpointException"
        onClick={handleAddEndpointExceptionClick}
        disabled={!canUserCRUD || !hasIndexWrite || !isEndpointAlert}
      >
        <EuiText size="m">{i18n.ACTION_ADD_ENDPOINT_EXCEPTION}</EuiText>
      </EuiContextMenuItem>
    );
  }, [canUserCRUD, hasIndexWrite, isEndpointAlert, handleAddEndpointExceptionClick]);

  const handleAddExceptionClick = useCallback((): void => {
    closePopover();
    handleOpenExceptionModal('detection');
  }, [closePopover, handleOpenExceptionModal]);

  const addExceptionComponent = useMemo(() => {
    return (
      <EuiContextMenuItem
        key="add-exception-menu-item"
        aria-label="Add Exception"
        data-test-subj="add-exception-menu-item"
        id="addException"
        onClick={handleAddExceptionClick}
        disabled={!canUserCRUD || !hasIndexWrite}
      >
        <EuiText data-test-subj="addExceptionButton" size="m">
          {i18n.ACTION_ADD_EXCEPTION}
        </EuiText>
      </EuiContextMenuItem>
    );
  }, [handleAddExceptionClick, canUserCRUD, hasIndexWrite]);

  const handleAddEventFilterClick = useCallback((): void => {
    closePopover();
    openAddEventFilterModal(true);
  }, [closePopover, openAddEventFilterModal]);

  const addEventFilterComponent = useMemo(
    () => (
      <EuiContextMenuItem
        key="add-event-filter-menu-item"
        aria-label="Add event filter"
        data-test-subj="add-event-filter-menu-item"
        id="addEventFilter"
        onClick={handleAddEventFilterClick}
      >
        <EuiText data-test-subj="addEventFilterButton" size="m">
          {i18n.ACTION_ADD_EVENT_FILTER}
        </EuiText>
      </EuiContextMenuItem>
    ),
    [handleAddEventFilterClick]
  );

  const statusFilters = useMemo(() => {
    if (!alertStatus) {
      return [];
    }

    switch (alertStatus) {
      case 'open':
        return [inProgressAlertActionComponent, closeAlertActionComponent];
      case 'in-progress':
        return [openAlertActionComponent, closeAlertActionComponent];
      case 'closed':
        return [openAlertActionComponent, inProgressAlertActionComponent];
      default:
        return [];
    }
  }, [
    closeAlertActionComponent,
    inProgressAlertActionComponent,
    openAlertActionComponent,
    alertStatus,
  ]);

  const items = useMemo(
    () =>
      !isEvent && ruleId
        ? [...statusFilters, addEndpointExceptionComponent, addExceptionComponent]
        : [addEventFilterComponent],
    [
      addEndpointExceptionComponent,
      addExceptionComponent,
      addEventFilterComponent,
      statusFilters,
      ruleId,
      isEvent,
    ]
  );

  return {
    items,
  };
};
