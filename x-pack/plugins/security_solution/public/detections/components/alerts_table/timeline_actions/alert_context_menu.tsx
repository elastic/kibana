/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiText,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiPopover,
  EuiContextMenuItem,
} from '@elastic/eui';
import styled from 'styled-components';

import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';

import { timelineActions } from '../../../../timelines/store/timeline';
import { EventsTd, EventsTdContent } from '../../../../timelines/components/timeline/styles';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../../../timelines/components/timeline/helpers';
import { FILTER_OPEN, FILTER_CLOSED, FILTER_IN_PROGRESS } from '../alerts_filter_group';
import { updateAlertStatusAction } from '../actions';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
import { Ecs, TimelineNonEcsData } from '../../../../graphql/types';
import {
  AddExceptionModal as AddExceptionModalComponent,
  AddExceptionModalBaseProps,
} from '../../../../common/components/exceptions/add_exception_modal';
import { getMappedNonEcsValue } from '../../../../common/components/exceptions/helpers';
import * as i18n from '../translations';
import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../../common/components/toasters';
import { useUserData } from '../../user_info';

interface AlertContextMenuProps {
  ecsRowData: Ecs;
  nonEcsRowData: TimelineNonEcsData[];
  timelineId: string;
}

const addExceptionModalInitialState: AddExceptionModalBaseProps = {
  ruleName: '',
  ruleId: '',
  ruleIndices: [],
  exceptionListType: 'detection',
  alertData: undefined,
};

export const AlertContextMenu = React.memo<AlertContextMenuProps>(
  ({ ecsRowData, nonEcsRowData, timelineId }) => {
    const dispatch = useDispatch();
    const [, dispatchToaster] = useStateToaster();
    const [isPopoverOpen, setPopover] = useState(false);
    const alertStatus =
      (ecsRowData.signal?.status && (ecsRowData.signal.status[0] as Status)) ?? undefined;
    const eventId = ecsRowData._id;

    const onButtonClick = useCallback(() => {
      setPopover(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopover = useCallback(() => {
      setPopover(false);
    }, []);
    const [shouldShowAddExceptionModal, setShouldShowAddExceptionModal] = useState(false);
    const [addExceptionModalState, setAddExceptionModalState] = useState<
      AddExceptionModalBaseProps
    >(addExceptionModalInitialState);
    const [{ canUserCRUD, hasIndexWrite }] = useUserData();

    const isEndpointAlert = useMemo(() => {
      if (!nonEcsRowData) return false;
      const [module] = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.original_event.module',
      });
      const [kind] = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.original_event.kind',
      });
      return module === 'endpoint' && kind === 'alert';
    }, [nonEcsRowData]);

    const closeAddExceptionModal = useCallback(() => {
      setShouldShowAddExceptionModal(false);
      setAddExceptionModalState(addExceptionModalInitialState);
    }, [setShouldShowAddExceptionModal, setAddExceptionModalState]);

    const onAddExceptionCancel = useCallback(() => {
      closeAddExceptionModal();
    }, [closeAddExceptionModal]);

    const onAddExceptionConfirm = useCallback(() => closeAddExceptionModal(), [
      closeAddExceptionModal,
    ]);

    const onAlertStatusUpdateSuccess = useCallback(
      (count: number, newStatus: Status) => {
        let title: string;
        switch (newStatus) {
          case 'closed':
            title = i18n.CLOSED_ALERT_SUCCESS_TOAST(count);
            break;
          case 'open':
            title = i18n.OPENED_ALERT_SUCCESS_TOAST(count);
            break;
          case 'in-progress':
            title = i18n.IN_PROGRESS_ALERT_SUCCESS_TOAST(count);
        }
        displaySuccessToast(title, dispatchToaster);
      },
      [dispatchToaster]
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

    const openAlertActionComponent = (
      <EuiContextMenuItem
        key="open-alert"
        aria-label="Open alert"
        data-test-subj="open-alert-status"
        id={FILTER_OPEN}
        onClick={openAlertActionOnClick}
        disabled={!canUserCRUD || !hasIndexWrite}
      >
        <EuiText size="m">{i18n.ACTION_OPEN_ALERT}</EuiText>
      </EuiContextMenuItem>
    );

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

    const closeAlertActionComponent = (
      <EuiContextMenuItem
        key="close-alert"
        aria-label="Close alert"
        data-test-subj="close-alert-status"
        id={FILTER_CLOSED}
        onClick={closeAlertActionClick}
        disabled={!canUserCRUD || !hasIndexWrite}
      >
        <EuiText size="m">{i18n.ACTION_CLOSE_ALERT}</EuiText>
      </EuiContextMenuItem>
    );

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

    const inProgressAlertActionComponent = (
      <EuiContextMenuItem
        key="in-progress-alert"
        aria-label="Mark alert in progress"
        data-test-subj="in-progress-alert-status"
        id={FILTER_IN_PROGRESS}
        onClick={inProgressAlertActionClick}
        disabled={!canUserCRUD || !hasIndexWrite}
      >
        <EuiText size="m">{i18n.ACTION_IN_PROGRESS_ALERT}</EuiText>
      </EuiContextMenuItem>
    );

    const openAddExceptionModal = useCallback(
      ({
        ruleName,
        ruleIndices,
        ruleId,
        exceptionListType,
        alertData,
      }: AddExceptionModalBaseProps) => {
        if (alertData !== null && alertData !== undefined) {
          setShouldShowAddExceptionModal(true);
          setAddExceptionModalState({
            ruleName,
            ruleId,
            ruleIndices,
            exceptionListType,
            alertData,
          });
        }
      },
      [setShouldShowAddExceptionModal, setAddExceptionModalState]
    );

    const AddExceptionModal = useCallback(
      () =>
        shouldShowAddExceptionModal === true && addExceptionModalState.alertData !== null ? (
          <AddExceptionModalComponent
            ruleName={addExceptionModalState.ruleName}
            ruleId={addExceptionModalState.ruleId}
            ruleIndices={addExceptionModalState.ruleIndices}
            exceptionListType={addExceptionModalState.exceptionListType}
            alertData={addExceptionModalState.alertData}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
            alertStatus={alertStatus}
          />
        ) : null,
      [
        shouldShowAddExceptionModal,
        addExceptionModalState.alertData,
        addExceptionModalState.ruleName,
        addExceptionModalState.ruleId,
        addExceptionModalState.ruleIndices,
        addExceptionModalState.exceptionListType,
        onAddExceptionCancel,
        onAddExceptionConfirm,
        alertStatus,
      ]
    );

    const button = (
      <EuiButtonIcon
        aria-label="context menu"
        data-test-subj="timeline-context-menu-button"
        size="s"
        iconType="boxesHorizontal"
        onClick={onButtonClick}
      />
    );

    const handleAddEndpointExceptionClick = useCallback(() => {
      const [ruleName] = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.rule.name',
      });
      const [ruleId] = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.rule.id',
      });
      const ruleIndices = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.rule.index',
      });

      closePopover();

      if (ruleId !== undefined) {
        openAddExceptionModal({
          ruleName: ruleName ?? '',
          ruleId,
          ruleIndices: ruleIndices.length > 0 ? ruleIndices : DEFAULT_INDEX_PATTERN,
          exceptionListType: 'endpoint',
          alertData: {
            ecsData: ecsRowData,
            nonEcsData: nonEcsRowData,
          },
        });
      }
    }, [closePopover, ecsRowData, nonEcsRowData, openAddExceptionModal]);

    const addEndpointExceptionComponent = (
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

    const handleAddExceptionClick = useCallback(() => {
      const [ruleName] = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.rule.name',
      });
      const [ruleId] = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.rule.id',
      });
      const ruleIndices = getMappedNonEcsValue({
        data: nonEcsRowData,
        fieldName: 'signal.rule.index',
      });

      closePopover();

      if (ruleId !== undefined) {
        openAddExceptionModal({
          ruleName: ruleName ?? '',
          ruleId,
          ruleIndices: ruleIndices.length > 0 ? ruleIndices : DEFAULT_INDEX_PATTERN,
          exceptionListType: 'detection',
          alertData: {
            ecsData: ecsRowData,
            nonEcsData: nonEcsRowData,
          },
        });
      }
    }, [closePopover, ecsRowData, nonEcsRowData, openAddExceptionModal]);

    const addExceptionComponent = (
      <EuiContextMenuItem
        key="add-exception-menu-item"
        aria-label="Add Exception"
        data-test-subj="add-exception-menu-item"
        id="addException"
        onClick={handleAddExceptionClick}
        disabled={!canUserCRUD || !hasIndexWrite}
      >
        <EuiText size="m">{i18n.ACTION_ADD_EXCEPTION}</EuiText>
      </EuiContextMenuItem>
    );

    const statusFilters = useMemo(() => {
      if (!alertStatus) return [];

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
      alertStatus,
      closeAlertActionComponent,
      inProgressAlertActionComponent,
      openAlertActionComponent,
    ]);

    const items = useMemo(
      () => [...statusFilters, addEndpointExceptionComponent, addExceptionComponent],
      [addEndpointExceptionComponent, addExceptionComponent, statusFilters]
    );

    return (
      <>
        <EventsTd key="actions-context-menu">
          <EventsTdContent textAlign="center" width={DEFAULT_ICON_BUTTON_WIDTH}>
            <EuiPopover
              id="singlePanel"
              button={button}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downLeft"
              repositionOnScroll
            >
              <ContextMenuPanel items={items} />
            </EuiPopover>
          </EventsTdContent>
        </EventsTd>
        <AddExceptionModal />
      </>
    );
  }
);

const ContextMenuPanel = styled(EuiContextMenuPanel)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

ContextMenuPanel.displayName = 'ContextMenuPanel';
