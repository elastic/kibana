/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { EuiText, EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import styled from 'styled-components';
import { getOr } from 'lodash/fp';

import { CommentType } from '../../../../../../case/common/api';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { TimelineId } from '../../../../../common/types/timeline';
import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { Status, Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { isThresholdRule } from '../../../../../common/detection_engine/utils';
import { timelineActions } from '../../../../timelines/store/timeline';
import { EventsTd, EventsTdContent } from '../../../../timelines/components/timeline/styles';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../../../timelines/components/timeline/helpers';
import { FILTER_OPEN, FILTER_CLOSED, FILTER_IN_PROGRESS } from '../alerts_filter_group';
import { updateAlertStatusAction } from '../actions';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
import { Ecs } from '../../../../../common/ecs';
import { AddExceptionModal } from '../../../../common/components/exceptions/add_exception_modal';
import * as i18nCommon from '../../../../common/translations';
import * as i18n from '../translations';
import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../../common/components/toasters';
import { inputsModel } from '../../../../common/store';
import { useUserData } from '../../user_info';
import { ExceptionListType } from '../../../../../common/shared_imports';
import { useCreateCaseModal } from '../../../../cases/components/use_create_case_modal';
import { usePostComment } from '../../../../cases/containers/use_post_comment';
import { Case } from '../../../../cases/containers/types';
import { useAllCasesModal } from '../../../../cases/components/use_all_cases_modal';

interface AlertContextMenuProps {
  disabled: boolean;
  ecsRowData: Ecs;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  timelineId: string;
}

const AlertContextMenuComponent: React.FC<AlertContextMenuProps> = ({
  disabled,
  ecsRowData,
  refetch,
  onRuleChange,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const [, dispatchToaster] = useStateToaster();
  const [isPopoverOpen, setPopover] = useState(false);
  const [alertStatus, setAlertStatus] = useState<Status | undefined>(
    (ecsRowData.signal?.status && (ecsRowData.signal.status[0] as Status)) ?? undefined
  );
  const eventId = ecsRowData._id;
  const eventIndex = ecsRowData._index;
  const ruleId = useMemo(
    (): string | null =>
      (ecsRowData.signal?.rule && ecsRowData.signal.rule.id && ecsRowData.signal.rule.id[0]) ??
      null,
    [ecsRowData]
  );
  const ruleName = useMemo(
    (): string =>
      (ecsRowData.signal?.rule && ecsRowData.signal.rule.name && ecsRowData.signal.rule.name[0]) ??
      '',
    [ecsRowData]
  );
  const ruleIndices = useMemo((): string[] => {
    if (
      ecsRowData.signal?.rule &&
      ecsRowData.signal.rule.index &&
      ecsRowData.signal.rule.index.length > 0
    ) {
      return ecsRowData.signal.rule.index;
    } else {
      return DEFAULT_INDEX_PATTERN;
    }
  }, [ecsRowData]);

  const { addWarning } = useAppToasts();

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback((): void => {
    setPopover(false);
  }, []);
  const [exceptionModalType, setOpenAddExceptionModal] = useState<ExceptionListType | null>(null);
  const [{ canUserCRUD, hasIndexWrite }] = useUserData();

  const { postComment } = usePostComment();
  const attachAlertToCase = useCallback(
    (theCase: Case) => {
      postComment(
        theCase.id,
        {
          type: CommentType.alert as const,
          alertId: eventId,
          index: eventIndex ?? '',
        },
        () => displaySuccessToast(i18n.CASE_CREATED_SUCCESS_TOAST(theCase.title), dispatchToaster)
      );
    },
    [dispatchToaster, eventId, postComment, eventIndex]
  );

  const onCaseCreated = useCallback((theCase: Case) => attachAlertToCase(theCase), [
    attachAlertToCase,
  ]);

  const { Modal: CreateCaseModal, openModal: openCreateCaseModal } = useCreateCaseModal({
    onCaseCreated,
  });

  const onCaseClicked = useCallback(
    (theCase) => {
      /**
       * No cases listed on the table.
       * The user pressed the add new case table's button.
       * We gonna open the create case modal.
       */
      if (theCase == null) {
        openCreateCaseModal();
        return;
      }

      attachAlertToCase(theCase);
    },
    [attachAlertToCase, openCreateCaseModal]
  );

  const { Modal: AllCasesModal, openModal: openAllCaseModal } = useAllCasesModal({
    onRowClick: onCaseClicked,
  });

  const isEndpointAlert = useMemo((): boolean => {
    if (ecsRowData == null) {
      return false;
    }

    const eventModules = getOr([], 'signal.original_event.module', ecsRowData);
    const kinds = getOr([], 'signal.original_event.kind', ecsRowData);

    return eventModules.includes('endpoint') && kinds.includes('alert');
  }, [ecsRowData]);

  const closeAddExceptionModal = useCallback((): void => {
    setOpenAddExceptionModal(null);
  }, []);

  const onAddExceptionCancel = useCallback(() => {
    closeAddExceptionModal();
  }, [closeAddExceptionModal]);

  const onAddExceptionConfirm = useCallback(
    (didCloseAlert: boolean, didBulkCloseAlert) => {
      closeAddExceptionModal();
      if (didCloseAlert) {
        setAlertStatus('closed');
      }
      if (timelineId !== TimelineId.active || didBulkCloseAlert) {
        refetch();
      }
    },
    [closeAddExceptionModal, timelineId, refetch]
  );

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
      setAlertStatus(newStatus);
    },
    [dispatchToaster, addWarning]
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

  const openAlertActionPanelItem = useMemo(
    () => ({
      name: <EuiText size="m">{i18n.ACTION_OPEN_ALERT}</EuiText>,
      key: 'open-alert',
      'aria-label': 'Open alert',
      'data-test-subj': 'open-alert-status',
      onClick: openAlertActionOnClick,
      disabled: !canUserCRUD || !hasIndexWrite,
    }),
    [canUserCRUD, hasIndexWrite, openAlertActionOnClick]
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

  const closeAlertActionPanelItem = useMemo(
    () => ({
      name: <EuiText size="m">{i18n.ACTION_CLOSE_ALERT}</EuiText>,
      key: 'close-alert',
      'aria-label': 'Close alert',
      'data-test-subj': 'close-alert-status',
      onClick: closeAlertActionClick,
      disabled: !canUserCRUD || !hasIndexWrite,
    }),
    [canUserCRUD, closeAlertActionClick, hasIndexWrite]
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

  const inProgressAlertActionPanelItem = useMemo(
    () => ({
      name: <EuiText size="m">{i18n.ACTION_IN_PROGRESS_ALERT}</EuiText>,
      key: 'in-progress-alert',
      'aria-label': 'Mark alert in progress',
      'data-test-subj': 'in-progress-alert-status',
      id: FILTER_IN_PROGRESS,
      onClick: inProgressAlertActionClick,
      disabled: !canUserCRUD || !hasIndexWrite,
    }),
    [canUserCRUD, hasIndexWrite, inProgressAlertActionClick]
  );

  const button = (
    <EuiButtonIcon
      aria-label="context menu"
      data-test-subj="timeline-context-menu-button"
      size="s"
      iconType="boxesHorizontal"
      onClick={onButtonClick}
      disabled={disabled}
    />
  );

  const handleAddEndpointExceptionClick = useCallback((): void => {
    closePopover();
    setOpenAddExceptionModal('endpoint');
  }, [closePopover]);

  const addEndpointExceptionPanelItem = useMemo(
    () => ({
      key: 'add-endpoint-exception-menu-item',
      'aria-label': 'Add Endpoint Exception',
      'data-test-subj': 'add-endpoint-exception-menu-item',
      onClick: handleAddEndpointExceptionClick,
      disabled: !canUserCRUD || !hasIndexWrite || !isEndpointAlert,
      name: <EuiText size="m">{i18n.ACTION_ADD_ENDPOINT_EXCEPTION}</EuiText>,
    }),
    [canUserCRUD, handleAddEndpointExceptionClick, hasIndexWrite, isEndpointAlert]
  );

  const handleAddExceptionClick = useCallback((): void => {
    closePopover();
    setOpenAddExceptionModal('detection');
  }, [closePopover]);

  const areExceptionsAllowed = useMemo((): boolean => {
    const ruleTypes = getOr([], 'signal.rule.type', ecsRowData);
    const [ruleType] = ruleTypes as Type[];
    return !isThresholdRule(ruleType);
  }, [ecsRowData]);

  const addExceptionPanelItem = useMemo(
    () => ({
      key: 'add-exception-menu-item',
      'aria-label': 'Add Exception',
      'data-test-subj': 'add-exception-menu-item',
      onClick: handleAddExceptionClick,
      disabled: !canUserCRUD || !hasIndexWrite || !areExceptionsAllowed,
      name: <EuiText size="m">{i18n.ACTION_ADD_EXCEPTION}</EuiText>,
    }),
    [areExceptionsAllowed, canUserCRUD, handleAddExceptionClick, hasIndexWrite]
  );

  const handleAddNewCaseClick = useCallback(() => {
    closePopover();
    openCreateCaseModal();
  }, [closePopover, openCreateCaseModal]);

  const handleAddExistingCaseClick = useCallback(() => {
    closePopover();
    openAllCaseModal();
  }, [closePopover, openAllCaseModal]);

  const addToCasePanel = useMemo(
    () => ({
      id: 1,
      title: i18n.ACTION_ADD_CASE,
      items: [
        {
          key: 'add-new-case-menu-item',
          'aria-label': 'Add to new case',
          'data-test-subj': 'add-new-case-item',
          onClick: handleAddNewCaseClick,
          disabled: !canUserCRUD,
          name: <EuiText size="m">{i18n.ACTION_ADD_NEW_CASE}</EuiText>,
        },
        {
          key: 'add-existing-case-menu-item',
          'aria-label': 'Add to existing case',
          'data-test-subj': 'add-existing-case-menu-item',
          onClick: handleAddExistingCaseClick,
          disabled: !canUserCRUD,
          name: <EuiText size="m">{i18n.ACTION_ADD_EXISTING_CASE}</EuiText>,
        },
      ],
    }),
    [canUserCRUD, handleAddExistingCaseClick, handleAddNewCaseClick]
  );

  const statusFilters = useMemo(() => {
    if (!alertStatus) {
      return [];
    }

    switch (alertStatus) {
      case 'open':
        return [inProgressAlertActionPanelItem, closeAlertActionPanelItem];
      case 'in-progress':
        return [openAlertActionPanelItem, closeAlertActionPanelItem];
      case 'closed':
        return [openAlertActionPanelItem, inProgressAlertActionPanelItem];
      default:
        return [];
    }
  }, [
    alertStatus,
    closeAlertActionPanelItem,
    inProgressAlertActionPanelItem,
    openAlertActionPanelItem,
  ]);

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          ...statusFilters,
          addEndpointExceptionPanelItem,
          addExceptionPanelItem,
          { name: <EuiText size="m">{i18n.ACTION_ADD_CASE}</EuiText>, panel: 1 },
        ],
      },
      addToCasePanel,
    ],
    [addEndpointExceptionPanelItem, addExceptionPanelItem, statusFilters, addToCasePanel]
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
            <ContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EventsTdContent>
      </EventsTd>
      {exceptionModalType != null && ruleId != null && ecsRowData != null && (
        <AddExceptionModal
          ruleName={ruleName}
          ruleId={ruleId}
          ruleIndices={ruleIndices}
          exceptionListType={exceptionModalType}
          alertData={ecsRowData}
          onCancel={onAddExceptionCancel}
          onConfirm={onAddExceptionConfirm}
          alertStatus={alertStatus}
          onRuleChange={onRuleChange}
        />
      )}
      <CreateCaseModal />
      <AllCasesModal />
    </>
  );
};

const ContextMenu = styled(EuiContextMenu)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

ContextMenu.displayName = 'ContextMenu';

export const AlertContextMenu = React.memo(AlertContextMenuComponent);
