/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { GuidedOnboardingTourStep } from '../../../common/components/guided_onboarding_tour/tour_step';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../../common/components/guided_onboarding_tour/tour_config';
import { isActiveTimeline } from '../../../helpers';
import { TableId } from '../../../../common/types';
import { useResponderActionItem } from '../endpoint_responder';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { TAKE_ACTION } from '../alerts_table/additional_filters_action/translations';
import { useExceptionActions } from '../alerts_table/timeline_actions/use_add_exception_actions';
import { useAlertsActions } from '../alerts_table/timeline_actions/use_alerts_actions';
import { useInvestigateInTimeline } from '../alerts_table/timeline_actions/use_investigate_in_timeline';

import { useEventFilterAction } from '../alerts_table/timeline_actions/use_event_filter_action';
import { useHostIsolationAction } from '../host_isolation/use_host_isolation_action';
import { getFieldValue } from '../host_isolation/helpers';
import type { Ecs } from '../../../../common/ecs';
import type { Status } from '../../../../common/detection_engine/schemas/common/schemas';
import { isAlertFromEndpointAlert } from '../../../common/utils/endpoint_alert_check';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useAddToCaseActions } from '../alerts_table/timeline_actions/use_add_to_case_actions';
import { useKibana } from '../../../common/lib/kibana';
import { OsqueryActionItem } from '../osquery/osquery_action_item';

interface ActionsData {
  alertStatus: Status;
  eventId: string;
  eventKind: string;
  ruleId: string;
  ruleName: string;
}

export interface TakeActionDropdownProps {
  detailsData: TimelineEventsDetailsItem[] | null;
  ecsData?: Ecs;
  handleOnEventClosed: () => void;
  indexName: string;
  isHostIsolationPanelOpen: boolean;
  loadingEventDetails: boolean;
  onAddEventFilterClick: () => void;
  onAddExceptionTypeClick: (type?: ExceptionListTypeEnum) => void;
  onAddIsolationStatusClick: (action: 'isolateHost' | 'unisolateHost') => void;
  refetch: (() => void) | undefined;
  refetchFlyoutData: () => Promise<void>;
  onOsqueryClick: (id: string) => void;
  scopeId: string;
}

export const TakeActionDropdown = React.memo(
  ({
    detailsData,
    ecsData,
    handleOnEventClosed,
    indexName,
    isHostIsolationPanelOpen,
    loadingEventDetails,
    onAddEventFilterClick,
    onAddExceptionTypeClick,
    onAddIsolationStatusClick,
    refetch,
    refetchFlyoutData,
    onOsqueryClick,
    scopeId,
  }: TakeActionDropdownProps) => {
    const tGridEnabled = useIsExperimentalFeatureEnabled('tGridEnabled');
    const { loading: canAccessEndpointManagementLoading, canAccessEndpointManagement } =
      useUserPrivileges().endpointPrivileges;

    const canCreateEndpointEventFilters = useMemo(
      () => !canAccessEndpointManagementLoading && canAccessEndpointManagement,
      [canAccessEndpointManagement, canAccessEndpointManagementLoading]
    );
    const { osquery } = useKibana().services;

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const actionsData = useMemo(
      () =>
        [
          { category: 'kibana', field: 'kibana.alert.rule.uuid', name: 'ruleId' },
          { category: 'kibana', field: 'kibana.alert.rule.name', name: 'ruleName' },
          { category: 'kibana', field: 'kibana.alert.workflow_status', name: 'alertStatus' },
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

    const isEvent = actionsData.eventKind === 'event';

    const isAgentEndpoint = useMemo(() => ecsData?.agent?.type?.includes('endpoint'), [ecsData]);

    const isEndpointEvent = useMemo(() => isEvent && isAgentEndpoint, [isEvent, isAgentEndpoint]);

    const agentId = useMemo(
      () => getFieldValue({ category: 'agent', field: 'agent.id' }, detailsData),
      [detailsData]
    );

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

    const hostIsolationActionItems = useHostIsolationAction({
      closePopover: closePopoverHandler,
      detailsData,
      onAddIsolationStatusClick: handleOnAddIsolationStatusClick,
      isHostIsolationPanelOpen,
    });

    const endpointResponseActionsConsoleItems = useResponderActionItem(
      detailsData,
      closePopoverHandler
    );

    const handleOnAddExceptionTypeClick = useCallback(
      (type?: ExceptionListTypeEnum) => {
        onAddExceptionTypeClick(type);
        setIsPopoverOpen(false);
      },
      [onAddExceptionTypeClick]
    );

    const { exceptionActionItems } = useExceptionActions({
      isEndpointAlert: isAlertFromEndpointAlert({ ecsData }),
      onAddExceptionTypeClick: handleOnAddExceptionTypeClick,
    });

    const handleOnAddEventFilterClick = useCallback(() => {
      onAddEventFilterClick();
      setIsPopoverOpen(false);
    }, [onAddEventFilterClick]);

    const { eventFilterActionItems } = useEventFilterAction({
      onAddEventFilterClick: handleOnAddEventFilterClick,
      disabled: !isEndpointEvent || !canCreateEndpointEventFilters,
    });

    const onMenuItemClick = useCallback(() => {
      closePopoverHandler();
    }, [closePopoverHandler]);

    const { actionItems: statusActionItems } = useAlertsActions({
      alertStatus: actionsData.alertStatus,
      closePopover: closePopoverAndFlyout,
      eventId: actionsData.eventId,
      indexName,
      refetch,
      scopeId,
    });

    const { investigateInTimelineActionItems } = useInvestigateInTimeline({
      ecsRowData: ecsData,
      onInvestigateInTimelineAlertClick: closePopoverHandler,
    });

    const osqueryAvailable = osquery?.isOsqueryAvailable({
      agentId,
    });

    const handleOnOsqueryClick = useCallback(() => {
      onOsqueryClick(agentId);
      setIsPopoverOpen(false);
    }, [onOsqueryClick, setIsPopoverOpen, agentId]);

    const osqueryActionItem = useMemo(
      () =>
        OsqueryActionItem({
          handleClick: handleOnOsqueryClick,
        }),
      [handleOnOsqueryClick]
    );

    const alertsActionItems = useMemo(
      () =>
        !isEvent && actionsData.ruleId
          ? [...statusActionItems, ...exceptionActionItems]
          : isEndpointEvent
          ? eventFilterActionItems
          : [],
      [
        eventFilterActionItems,
        isEndpointEvent,
        exceptionActionItems,
        statusActionItems,
        isEvent,
        actionsData.ruleId,
      ]
    );

    const isInDetections = [TableId.alertsOnAlertsPage, TableId.alertsOnRuleDetailsPage].includes(
      scopeId as TableId
    );

    const { addToCaseActionItems, handleAddToNewCaseClick } = useAddToCaseActions({
      ecsData,
      nonEcsData: detailsData?.map((d) => ({ field: d.field, value: d.values })) ?? [],
      onMenuItemClick,
      onSuccess: refetchFlyoutData,
      isActiveTimelines: isActiveTimeline(scopeId),
      isInDetections,
    });

    const items: React.ReactElement[] = useMemo(
      () => [
        ...(tGridEnabled ? addToCaseActionItems : []),
        ...alertsActionItems,
        ...hostIsolationActionItems,
        ...endpointResponseActionsConsoleItems,
        ...(osqueryAvailable ? [osqueryActionItem] : []),
        ...investigateInTimelineActionItems,
      ],
      [
        tGridEnabled,
        addToCaseActionItems,
        alertsActionItems,
        hostIsolationActionItems,
        endpointResponseActionsConsoleItems,
        osqueryAvailable,
        osqueryActionItem,
        investigateInTimelineActionItems,
      ]
    );

    const takeActionButton = useMemo(
      () => (
        <GuidedOnboardingTourStep
          onClick={handleAddToNewCaseClick}
          step={AlertsCasesTourSteps.addAlertToCase}
          tourId={SecurityStepId.alertsCases}
        >
          <EuiButton
            data-test-subj="take-action-dropdown-btn"
            fill
            iconSide="right"
            iconType="arrowDown"
            onClick={togglePopoverHandler}
          >
            {TAKE_ACTION}
          </EuiButton>
        </GuidedOnboardingTourStep>
      ),

      [handleAddToNewCaseClick, togglePopoverHandler]
    );

    return items.length && !loadingEventDetails && ecsData ? (
      <EuiPopover
        id="AlertTakeActionPanel"
        button={takeActionButton}
        isOpen={isPopoverOpen}
        closePopover={closePopoverHandler}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        repositionOnScroll
      >
        <EuiContextMenuPanel data-test-subj="takeActionPanelMenu" size="s" items={items} />
      </EuiPopover>
    ) : null;
  }
);
