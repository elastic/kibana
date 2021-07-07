/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { getOr } from 'lodash/fp';
import { indexOf } from 'lodash';

import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';
import { buildGetAlertByIdQuery } from '../../../../common/components/exceptions/helpers';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { TimelineId } from '../../../../../common/types/timeline';
import { DEFAULT_INDEX_PATTERN } from '../../../../../common/constants';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { timelineActions } from '../../../../timelines/store/timeline';
import { EventsTdContent } from '../../../../timelines/components/timeline/styles';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../../../timelines/components/timeline/helpers';
import { FILTER_OPEN, FILTER_CLOSED, FILTER_IN_PROGRESS } from '../alerts_filter_group';
import { updateAlertStatusAction } from '../actions';
import { SetEventsDeletedProps, SetEventsLoadingProps } from '../types';
import { Ecs } from '../../../../../common/ecs';
import {
  AddExceptionModal,
  AddExceptionModalProps,
} from '../../../../common/components/exceptions/add_exception_modal';
import * as i18nCommon from '../../../../common/translations';
import * as i18n from '../translations';
import {
  useStateToaster,
  displaySuccessToast,
  displayErrorToast,
} from '../../../../common/components/toasters';
import { inputsModel } from '../../../../common/store';
import { useUserData } from '../../user_info';
import { AlertData, EcsHit } from '../../../../common/components/exceptions/types';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { useSignalIndex } from '../../../containers/detection_engine/alerts/use_signal_index';
import { EventFiltersModal } from '../../../../management/pages/event_filters/view/components/modal';

interface AlertContextMenuProps {
  ariaLabel?: string;
  disabled: boolean;
  ecsRowData: Ecs;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  timelineId: string;
}

const AlertContextMenuComponent: React.FC<AlertContextMenuProps> = ({
  ariaLabel = i18n.MORE_ACTIONS,
  disabled,
  ecsRowData,
  refetch,
  onRuleChange,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const [, dispatchToaster] = useStateToaster();
  const [isPopoverOpen, setPopover] = useState(false);
  const eventId = ecsRowData._id;
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

  const isEvent = useMemo(() => indexOf(ecsRowData.event?.kind, 'event') !== -1, [ecsRowData]);
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

  const alertStatus = useMemo(() => {
    return ecsRowData.signal?.status && (ecsRowData.signal.status[0] as Status);
  }, [ecsRowData]);

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback((): void => {
    setPopover(false);
  }, []);
  const [exceptionModalType, setOpenAddExceptionModal] = useState<ExceptionListType | null>(null);
  const [isAddEventFilterModalOpen, setIsAddEventFilterModalOpen] = useState<boolean>(false);
  const [{ canUserCRUD, hasIndexWrite, hasIndexMaintenance, hasIndexUpdateDelete }] = useUserData();

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

  const closeAddEventFilterModal = useCallback((): void => {
    setIsAddEventFilterModalOpen(false);
  }, []);

  const onAddExceptionCancel = useCallback(() => {
    closeAddExceptionModal();
  }, [closeAddExceptionModal]);

  const onAddExceptionConfirm = useCallback(
    (didCloseAlert: boolean, didBulkCloseAlert) => {
      closeAddExceptionModal();
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

  const button = useMemo(() => {
    return (
      <EuiToolTip position="top" content={i18n.MORE_ACTIONS}>
        <EuiButtonIcon
          aria-label={ariaLabel}
          data-test-subj="timeline-context-menu-button"
          size="s"
          iconType="boxesHorizontal"
          onClick={onButtonClick}
          isDisabled={disabled}
        />
      </EuiToolTip>
    );
  }, [disabled, onButtonClick, ariaLabel]);

  const handleAddEndpointExceptionClick = useCallback((): void => {
    closePopover();
    setOpenAddExceptionModal('endpoint');
  }, [closePopover]);

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
    setOpenAddExceptionModal('detection');
  }, [closePopover]);

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
    setIsAddEventFilterModalOpen(true);
  }, [closePopover]);

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

  return (
    <>
      <div key="actions-context-menu">
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
      </div>
      {exceptionModalType != null && ruleId != null && ecsRowData != null && (
        <AddExceptionModalWrapper
          ruleName={ruleName}
          ruleId={ruleId}
          ruleIndices={ruleIndices}
          exceptionListType={exceptionModalType}
          ecsData={ecsRowData}
          onCancel={onAddExceptionCancel}
          onConfirm={onAddExceptionConfirm}
          alertStatus={alertStatus}
          onRuleChange={onRuleChange}
        />
      )}
      {isAddEventFilterModalOpen && ecsRowData != null && (
        <EventFiltersModal data={ecsRowData} onCancel={closeAddEventFilterModal} />
      )}
    </>
  );
};

const ContextMenuPanel = styled(EuiContextMenuPanel)`
  font-size: ${({ theme }) => theme.eui.euiFontSizeS};
`;

ContextMenuPanel.displayName = 'ContextMenuPanel';

export const AlertContextMenu = React.memo(AlertContextMenuComponent);

type AddExceptionModalWrapperProps = Omit<
  AddExceptionModalProps,
  'alertData' | 'isAlertDataLoading'
> & {
  ecsData: Ecs;
};

/**
 * This component exists to fetch needed data outside of the AddExceptionModal
 * Due to the conditional nature of the modal and how we use the `ecsData` field,
 * we cannot use the fetch hook within the modal component itself
 */
const AddExceptionModalWrapper: React.FC<AddExceptionModalWrapperProps> = ({
  ruleName,
  ruleId,
  ruleIndices,
  exceptionListType,
  ecsData,
  onCancel,
  onConfirm,
  alertStatus,
  onRuleChange,
}) => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const { loading: isLoadingAlertData, data } = useQueryAlerts<EcsHit, {}>({
    query: buildGetAlertByIdQuery(ecsData?._id),
    indexName: signalIndexName,
  });

  const enrichedAlert: AlertData | undefined = useMemo(() => {
    if (isLoadingAlertData === false) {
      const hit = data?.hits.hits[0];
      if (!hit) {
        return undefined;
      }
      const { _id, _index, _source } = hit;
      return { ..._source, _id, _index };
    }
  }, [data?.hits.hits, isLoadingAlertData]);

  const isLoading = isLoadingAlertData && isSignalIndexLoading;

  return (
    <AddExceptionModal
      ruleName={ruleName}
      ruleId={ruleId}
      ruleIndices={ruleIndices}
      exceptionListType={exceptionListType}
      alertData={enrichedAlert}
      isAlertDataLoading={isLoading}
      onCancel={onCancel}
      onConfirm={onConfirm}
      alertStatus={alertStatus}
      onRuleChange={onRuleChange}
    />
  );
};
