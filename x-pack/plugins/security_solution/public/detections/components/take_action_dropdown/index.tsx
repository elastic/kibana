/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiContextMenu, EuiContextMenuPanel, EuiButton, EuiPopover } from '@elastic/eui';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';

import { TAKE_ACTION } from '../alerts_table/alerts_utility_bar/translations';

import { TimelineEventsDetailsItem, TimelineNonEcsData } from '../../../../common';
import { useExceptionActions } from '../alerts_table/timeline_actions/use_add_exception_actions';
import { useAlertsActions } from '../alerts_table/timeline_actions/use_alerts_actions';
import { useInvestigateInTimeline } from '../alerts_table/timeline_actions/use_investigate_in_timeline';
import { ACTION_ADD_TO_CASE } from '../alerts_table/translations';
import { useGetUserCasesPermissions, useKibana } from '../../../common/lib/kibana';
import { useInsertTimeline } from '../../../cases/components/use_insert_timeline';
import { addToCaseActionItem } from './helpers';
import { useEventFilterAction } from '../alerts_table/timeline_actions/use_event_filter_action';
import { useHostIsolationAction } from '../host_isolation/use_host_isolation_action';
import { CHANGE_ALERT_STATUS } from './translations';
import { getFieldValue } from '../host_isolation/helpers';
import type { Ecs } from '../../../../common/ecs';
import { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { endpointAlertCheck } from '../../../common/utils/endpoint_alert_check';
import { APP_ID } from '../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

interface ActionsData {
  alertStatus: Status;
  eventId: string;
  eventKind: string;
  ruleId: string;
  ruleName: string;
}

export const TakeActionDropdown = React.memo(
  ({
    detailsData,
    ecsData,
    handleOnEventClosed,
    isHostIsolationPanelOpen,
    loadingEventDetails,
    nonEcsData,
    onAddEventFilterClick,
    onAddExceptionTypeClick,
    onAddIsolationStatusClick,
    refetch,
    indexName,
    timelineId,
  }: {
    detailsData: TimelineEventsDetailsItem[] | null;
    ecsData?: Ecs;
    handleOnEventClosed: () => void;
    isHostIsolationPanelOpen: boolean;
    loadingEventDetails: boolean;
    nonEcsData?: TimelineNonEcsData[];
    refetch: (() => void) | undefined;
    indexName: string;
    onAddEventFilterClick: () => void;
    onAddExceptionTypeClick: (type: ExceptionListType) => void;
    onAddIsolationStatusClick: (action: 'isolateHost' | 'unisolateHost') => void;
    timelineId: string;
  }) => {
    const casePermissions = useGetUserCasesPermissions();
    const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');

    const { timelines: timelinesUi } = useKibana().services;
    const insertTimelineHook = useInsertTimeline;
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const actionsData = useMemo(
      () =>
        [
          { category: 'signal', field: 'signal.rule.id', name: 'ruleId' },
          { category: 'signal', field: 'signal.rule.name', name: 'ruleName' },
          { category: 'signal', field: 'signal.status', name: 'alertStatus' },
          { category: 'event', field: 'event.kind', name: 'eventKind' },
          { category: '_id', field: '_id', name: 'eventId' },
        ].reduce<ActionsData>(
          (acc, curr) => ({
            ...acc,
            [curr.name]: getFieldValue({ category: curr.category, field: curr.field }, detailsData),
          }),
          {} as ActionsData
        ),
      [detailsData]
    );

    const alertIds = useMemo(() => [actionsData.eventId], [actionsData.eventId]);
    const isEvent = actionsData.eventKind === 'event';

    const isEndpointAlert = useMemo((): boolean => {
      if (detailsData == null) {
        return false;
      }
      return endpointAlertCheck({ data: detailsData });
    }, [detailsData]);

    const togglePopoverHandler = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen]);

    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const closePopoverAndFlyout = useCallback(() => {
      handleOnEventClosed();
      setIsPopoverOpen(false);
    }, [handleOnEventClosed]);

    const handleOnAddIsolationStatusClick = useCallback(
      (action: 'isolateHost' | 'unisolateHost') => {
        onAddIsolationStatusClick(action);
        setIsPopoverOpen(false);
      },
      [onAddIsolationStatusClick]
    );

    const hostIsolationAction = useHostIsolationAction({
      closePopover: closePopoverHandler,
      detailsData,
      onAddIsolationStatusClick: handleOnAddIsolationStatusClick,
      isHostIsolationPanelOpen,
    });

    const handleOnAddExceptionTypeClick = useCallback(
      (type: ExceptionListType) => {
        onAddExceptionTypeClick(type);
        setIsPopoverOpen(false);
      },
      [onAddExceptionTypeClick]
    );

    const { exceptionActions } = useExceptionActions({
      isEndpointAlert,
      onAddExceptionTypeClick: handleOnAddExceptionTypeClick,
    });

    const handleOnAddEventFilterClick = useCallback(() => {
      onAddEventFilterClick();
      setIsPopoverOpen(false);
    }, [onAddEventFilterClick]);

    const eventFilterActions = useEventFilterAction({
      onAddEventFilterClick: handleOnAddEventFilterClick,
    });

    const afterCaseSelection = useCallback(() => {
      closePopoverHandler();
    }, [closePopoverHandler]);

    const { actionItems } = useAlertsActions({
      alertStatus: actionsData.alertStatus,
      eventId: actionsData.eventId,
      indexName,
      timelineId,
      refetch,
      closePopover: closePopoverAndFlyout,
    });

    const { investigateInTimelineAction } = useInvestigateInTimeline({
      alertIds,
      ecsRowData: ecsData,
      onInvestigateInTimelineAlertClick: closePopoverHandler,
    });

    const alertsActionItems = useMemo(
      () =>
        !isEvent && actionsData.ruleId
          ? [
              {
                name: CHANGE_ALERT_STATUS,
                panel: 1,
              },
              ...exceptionActions,
            ]
          : [eventFilterActions],
      [eventFilterActions, exceptionActions, isEvent, actionsData.ruleId]
    );

    const addToCaseProps = useMemo(() => {
      if (ecsData) {
        return {
          event: { data: [], ecs: ecsData, _id: ecsData._id },
          useInsertTimeline: insertTimelineHook,
          casePermissions,
          appId: APP_ID,
          onClose: afterCaseSelection,
        };
      } else {
        return null;
      }
    }, [afterCaseSelection, casePermissions, ecsData, insertTimelineHook]);

    const panels = useMemo(() => {
      if (tGridEnabled) {
        return [
          {
            id: 0,
            items: [
              ...alertsActionItems,
              ...addToCaseActionItem(timelineId),
              ...hostIsolationAction,
              ...investigateInTimelineAction,
            ],
          },
          {
            id: 1,
            title: CHANGE_ALERT_STATUS,
            content: <EuiContextMenuPanel size="s" items={actionItems} />,
          },
          {
            id: 2,
            title: ACTION_ADD_TO_CASE,
            content: [
              <>{addToCaseProps && timelinesUi.getAddToExistingCaseButton(addToCaseProps)}</>,
              <>{addToCaseProps && timelinesUi.getAddToNewCaseButton(addToCaseProps)}</>,
            ],
          },
        ];
      } else {
        return [
          {
            id: 0,
            items: [...alertsActionItems, ...hostIsolationAction, ...investigateInTimelineAction],
          },
          {
            id: 1,
            title: CHANGE_ALERT_STATUS,
            content: <EuiContextMenuPanel size="s" items={actionItems} />,
          },
        ];
      }
    }, [
      addToCaseProps,
      alertsActionItems,
      hostIsolationAction,
      investigateInTimelineAction,
      timelineId,
      timelinesUi,
      actionItems,
      tGridEnabled,
    ]);

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
          repositionOnScroll
        >
          <EuiContextMenu size="s" initialPanelId={0} panels={panels} />
        </EuiPopover>
      </>
    ) : null;
  }
);
