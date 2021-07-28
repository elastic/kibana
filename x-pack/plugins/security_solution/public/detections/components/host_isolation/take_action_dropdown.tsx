/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiContextMenu, EuiButton, EuiPopover } from '@elastic/eui';
import { indexOf, noop } from 'lodash';
import {
  CHANGE_ALERT_STATUS,
  ACTION_ADD_ENDPOINT_EXCEPTION,
  ACTION_ADD_EXCEPTION,
  ACTION_ADD_EVENT_FILTER,
} from './translations';
import { TAKE_ACTION } from '../alerts_table/alerts_utility_bar/translations';
import { useHostIsolationStatus } from '../../containers/detection_engine/alerts/use_host_isolation_status';
import { HostStatus } from '../../../../common/endpoint/types';
import { useIsolationPrivileges } from '../../../common/hooks/endpoint/use_isolate_privileges';

import { getEventType } from '../../../timelines/components/timeline/body/helpers';
import { TimelineNonEcsData } from '../../../../common';
import { Ecs } from '../../../../common/ecs';
import { useExceptionModal } from '../alerts_table/timeline_actions/use_add_exception_modal';
import { useAlertsActions } from '../alerts_table/timeline_actions/use_alerts_actions';
import { AddExceptionModalWrapper } from '../alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersModal } from '../../../management/pages/event_filters/view/components/modal';
import { useInvestigateInTimeline } from '../alerts_table/timeline_actions/use_investigate_in_timeline';
import {
  ACTION_INVESTIGATE_IN_TIMELINE /* ACTION_ADD_TO_CASE*/,
} from '../alerts_table/translations';
/* import { useGetUserCasesPermissions, useKibana } from '../../../common/lib/kibana';
import { useInsertTimeline } from '../../../cases/components/use_insert_timeline';
import { addToCaseActionItem } from './helpers'; */
import { useEventFilterModal } from '../alerts_table/timeline_actions/use_event_filter_modal';
import { useHostIsolationAction } from './use_host_isolation_action';

export const TakeActionDropdown = React.memo(
  ({
    onChange,
    agentId,
    eventId,
    ecsData,
    nonEcsData,
    isAlert,
    isEndpointAlert,
    isolationSupported,
    isHostIsolationPanelOpen,
    loadingEventDetails,
    timelineId,
    refetch,
    handleOnEventClosed,
  }: {
    onChange: (action: 'isolateHost' | 'unisolateHost') => void;
    agentId: string;
    eventId: string;
    ecsData?: Ecs;
    nonEcsData?: TimelineNonEcsData[];
    isAlert: boolean;
    isEndpointAlert: boolean;
    isolationSupported: boolean;
    isHostIsolationPanelOpen: boolean;
    loadingEventDetails: boolean;
    timelineId: string;
    refetch: (() => void) | undefined;
    handleOnEventClosed: () => void;
  }) => {
    const { loading, isIsolated: isolationStatus, agentStatus } = useHostIsolationStatus({
      agentId,
    });

    const { isAllowed: isIsolationAllowed } = useIsolationPrivileges();
    /* Add to case status
    const casePermissions = useGetUserCasesPermissions();
    const { timelines: timelinesUi } = useKibana().services;
    const insertTimelineHook = useInsertTimeline;
    */
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const isEvent = useMemo(() => ecsData && indexOf(ecsData.event?.kind, 'event') !== -1, [
      ecsData,
    ]);

    const togglePopoverHandler = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const eventType = ecsData != null ? getEventType(ecsData) : null;

    const { isolateHostHandler, isolateHostTitle } = useHostIsolationAction({
      onIsolationStatusChange: onChange,
      isolationStatus,
      closePopover: closePopoverHandler,
    });

    const {
      alertStatus,
      disabledAddException,
      disabledAddEndpointException,
      exceptionModalType,
      ruleId,
      ruleName,
      ruleIndices,
      onAddExceptionCancel,
      onAddExceptionConfirm,
      handleAddExceptionClick,
      handleAddEndpointExceptionClick,
    } = useExceptionModal({
      ecsRowData: ecsData,
      refetch: refetch ?? noop,
      timelineId,
      onAddExceptionClick: closePopoverHandler,
      onAddEndpointExceptionClick: closePopoverHandler,
    });

    const {
      closeAddEventFilterModal,
      handleAddEventFilterClick,
      isAddEventFilterModalOpen,
    } = useEventFilterModal({
      onAddEventFilterClick: closePopoverHandler,
    });

    const { statusActions } = useAlertsActions({
      ecsRowData: ecsData,
      timelineId,
      closePopover: closePopoverHandler,
    });

    const { handleInvestigateInTimelineAlertClick } = useInvestigateInTimeline({
      ecsRowData: ecsData ?? null,
      nonEcsRowData: nonEcsData ?? [],
      onInvestigateInTimelineAlertClick: closePopoverHandler,
    });

    const alertsActionItems = useMemo(
      () =>
        !isEvent && ruleId
          ? [
              {
                name: CHANGE_ALERT_STATUS,
                panel: 1,
              },
              {
                name: ACTION_ADD_ENDPOINT_EXCEPTION,
                onClick: handleAddEndpointExceptionClick,
                disabled: disabledAddEndpointException,
              },
              {
                name: ACTION_ADD_EXCEPTION,
                onClick: handleAddExceptionClick,
                disabled: disabledAddException,
              },
            ]
          : [
              {
                name: ACTION_ADD_EVENT_FILTER,
                onClick: handleAddEventFilterClick,
              },
            ],
      [
        disabledAddEndpointException,
        disabledAddException,
        handleAddEndpointExceptionClick,
        handleAddEventFilterClick,
        handleAddExceptionClick,
        isEvent,
        ruleId,
      ]
    );

    const panels = useMemo(
      () => [
        {
          id: 0,
          items: [
            ...alertsActionItems,
            /* ...addToCaseActionItem(timelineId),*/
            ...(isIsolationAllowed &&
            isEndpointAlert &&
            isolationSupported &&
            isHostIsolationPanelOpen === false
              ? [
                  {
                    name: isolateHostTitle,
                    onClick: isolateHostHandler,
                    disabled: loading || agentStatus === HostStatus.UNENROLLED,
                  },
                ]
              : []),
            ...(eventType === 'signal' && ecsData != null
              ? [
                  {
                    name: ACTION_INVESTIGATE_IN_TIMELINE,
                    onClick: handleInvestigateInTimelineAlertClick,
                  },
                ]
              : []),
          ],
        },
        {
          id: 1,
          title: CHANGE_ALERT_STATUS,
          items: statusActions,
        },
        /* {
          id: 2,
          title: ACTION_ADD_TO_CASE,
          content: (
            <>
              {ecsData &&
                timelinesUi.getAddToCaseAction({
                  ecsRowData: ecsData,
                  useInsertTimeline: insertTimelineHook,
                  casePermissions,
                  showIcon: false,
                })}
            </>
          ),
        },*/
      ],
      [
        agentStatus,
        alertsActionItems,
        ecsData,
        eventType,
        handleInvestigateInTimelineAlertClick,
        isEndpointAlert,
        isHostIsolationPanelOpen,
        isIsolationAllowed,
        isolateHostHandler,
        isolateHostTitle,
        isolationSupported,
        loading,
        statusActions,
      ]
    );

    const takeActionButton = useMemo(() => {
      return (
        <EuiButton iconSide="right" fill iconType="arrowDown" onClick={togglePopoverHandler}>
          {TAKE_ACTION}
        </EuiButton>
      );
    }, [togglePopoverHandler]);

    return panels[0].items?.length && !loadingEventDetails ? (
      <>
        <EuiPopover
          id="hostIsolationTakeActionPanel"
          button={takeActionButton}
          isOpen={isPopoverOpen}
          closePopover={closePopoverHandler}
          panelPaddingSize="none"
          anchorPosition="downLeft"
        >
          <EuiContextMenu size="s" initialPanelId={0} panels={panels} />
        </EuiPopover>
        {exceptionModalType != null && ruleId != null && ecsData != null && (
          <AddExceptionModalWrapper
            ruleName={ruleName}
            ruleId={ruleId}
            ruleIndices={ruleIndices}
            exceptionListType={exceptionModalType}
            ecsData={ecsData}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
            alertStatus={alertStatus}
          />
        )}
        {isAddEventFilterModalOpen && ecsData != null && (
          <EventFiltersModal data={ecsData} onCancel={closeAddEventFilterModal} />
        )}
      </>
    ) : null;
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
