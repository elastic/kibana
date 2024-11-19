/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover } from '@elastic/eui';
import type { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TableId } from '@kbn/securitysolution-data-table';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { i18n } from '@kbn/i18n';
import { FLYOUT_FOOTER_DEOPDOEN_BUTTON_TEST_ID } from '../test_ids';
import { getAlertDetailsFieldValue } from '../../../../common/lib/endpoint/utils/get_event_details_field_values';
import { GuidedOnboardingTourStep } from '../../../../common/components/guided_onboarding_tour/tour_step';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../../../common/components/guided_onboarding_tour/tour_config';
import { isActiveTimeline } from '../../../../helpers';
import { useAlertExceptionActions } from '../../../../detections/components/alerts_table/timeline_actions/use_add_exception_actions';
import { useAlertsActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alerts_actions';
import { useInvestigateInTimeline } from '../../../../detections/components/alerts_table/timeline_actions/use_investigate_in_timeline';
import { useEventFilterAction } from '../../../../detections/components/alerts_table/timeline_actions/use_event_filter_action';
import { useResponderActionItem } from '../../../../common/components/endpoint/responder';
import { useHostIsolationAction } from '../../../../common/components/endpoint/host_isolation';
import type { Status } from '../../../../../common/api/detection_engine';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useAddToCaseActions } from '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions';
import { useKibana } from '../../../../common/lib/kibana';
import { getOsqueryActionItem } from '../../../../detections/components/osquery/osquery_action_item';
import type { AlertTableContextMenuItem } from '../../../../detections/components/alerts_table/types';
import { useAlertTagsActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alert_tags_actions';
import { useAlertAssigneesActions } from '../../../../detections/components/alerts_table/timeline_actions/use_alert_assignees_actions';

const TAKE_ACTION = i18n.translate('xpack.securitySolution.flyout.footer.takeActionButtonLabel', {
  defaultMessage: 'Take action',
});

export interface AlertSummaryData {
  /**
   * Status of the alert (open, closed...)
   */
  alertStatus: Status;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Type of document (event, signal, alert...)
   */
  eventKind: string;
  /**
   * Id of the rule
   */
  ruleId: string;
  /**
   * Name of the rule
   */
  ruleName: string;
}

export interface TakeActionDropdownProps {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * The actual raw document object
   */
  dataAsNestedObject?: Ecs;
  /**
   * Callback called when the popover closes
   */
  handleOnEventClosed: () => void;
  /**
   * Callback to let the parent know if the isolation panel is opened or closed
   */
  isHostIsolationPanelOpen: boolean;
  /**
   * Callback to let parent know when the user interacts with the exception panel
   */
  onAddIsolationStatusClick: (action: 'isolateHost' | 'unisolateHost') => void;
  /**
   * Callback to let parent know when the user interacts with event filter
   */
  onAddEventFilterClick: () => void;
  /**
   * Callback to let parent know when the user interacts with the exception panel
   */
  onAddExceptionTypeClick: (type?: ExceptionListTypeEnum) => void;
  /**
   * Callback to let parent know when the user interacts with the osquery panel
   */
  onOsqueryClick: (id: string) => void;
  /**
   * Callback to refetch the data (from timeline query or global query)
   */
  refetch: (() => void) | undefined;
  /**
   * Callback to refetch the document
   */
  refetchFlyoutData: () => Promise<void>;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Take action button with dropdown used to show all the options available to the user on a document rendered in the expandable flyout
 */
export const TakeActionDropdown = memo(
  ({
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
    handleOnEventClosed,
    isHostIsolationPanelOpen,
    onAddEventFilterClick,
    onAddExceptionTypeClick,
    onAddIsolationStatusClick,
    refetch,
    refetchFlyoutData,
    onOsqueryClick,
    scopeId,
  }: TakeActionDropdownProps) => {
    // popover interaction
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const togglePopoverHandler = useCallback(() => {
      setIsPopoverOpen(!isPopoverOpen);
    }, [isPopoverOpen]);
    const closePopoverHandler = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);
    const onMenuItemClick = useCallback(() => {
      closePopoverHandler();
    }, [closePopoverHandler]);
    const closePopoverAndFlyout = useCallback(() => {
      handleOnEventClosed();
      setIsPopoverOpen(false);
    }, [handleOnEventClosed]);

    const alertSummaryData = useMemo(
      () =>
        [
          { category: 'kibana', field: 'kibana.alert.rule.uuid', name: 'ruleId' },
          { category: 'kibana', field: 'kibana.alert.rule.name', name: 'ruleName' },
          { category: 'kibana', field: 'kibana.alert.workflow_status', name: 'alertStatus' },
          { category: 'event', field: 'event.kind', name: 'eventKind' },
          { category: '_id', field: '_id', name: 'eventId' },
        ].reduce<AlertSummaryData>(
          (acc, curr) => ({
            ...acc,
            [curr.name]: getAlertDetailsFieldValue(
              { category: curr.category, field: curr.field },
              dataFormattedForFieldBrowser
            ),
          }),
          {} as AlertSummaryData
        ),
      [dataFormattedForFieldBrowser]
    );

    const isEvent = alertSummaryData.eventKind === 'event';

    const isAgentEndpoint = useMemo(
      () => dataAsNestedObject?.agent?.type?.includes('endpoint'),
      [dataAsNestedObject]
    );

    // host isolation interaction
    const handleOnAddIsolationStatusClick = useCallback(
      (action: 'isolateHost' | 'unisolateHost') => {
        onAddIsolationStatusClick(action);
        setIsPopoverOpen(false);
      },
      [onAddIsolationStatusClick]
    );
    const hostIsolationActionItems = useHostIsolationAction({
      closePopover: closePopoverHandler,
      detailsData: dataFormattedForFieldBrowser,
      onAddIsolationStatusClick: handleOnAddIsolationStatusClick,
      isHostIsolationPanelOpen,
    });

    // exception interaction
    const handleOnAddExceptionTypeClick = useCallback(
      (type?: ExceptionListTypeEnum) => {
        onAddExceptionTypeClick(type);
        setIsPopoverOpen(false);
      },
      [onAddExceptionTypeClick]
    );
    const { exceptionActionItems } = useAlertExceptionActions({
      isEndpointAlert: Boolean(isAgentEndpoint),
      onAddExceptionTypeClick: handleOnAddExceptionTypeClick,
    });

    // event filter interaction
    const handleOnAddEventFilterClick = useCallback(() => {
      onAddEventFilterClick();
      setIsPopoverOpen(false);
    }, [onAddEventFilterClick]);
    const { eventFilterActionItems } = useEventFilterAction({
      onAddEventFilterClick: handleOnAddEventFilterClick,
    });
    const { loading: endpointPrivilegesLoading, canWriteEventFilters } =
      useUserPrivileges().endpointPrivileges;
    const isEndpointEvent = useMemo(() => isEvent && isAgentEndpoint, [isEvent, isAgentEndpoint]);
    const canCreateEndpointEventFilters = useMemo(
      () => !endpointPrivilegesLoading && canWriteEventFilters,
      [canWriteEventFilters, endpointPrivilegesLoading]
    );

    // alert status interaction
    const { actionItems: statusActionItems } = useAlertsActions({
      alertStatus: alertSummaryData.alertStatus,
      closePopover: closePopoverAndFlyout,
      eventId: alertSummaryData.eventId,
      refetch,
      scopeId,
    });

    // alert tagging interation
    const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
      closePopover: closePopoverHandler,
      ecsRowData: dataAsNestedObject ?? { _id: alertSummaryData.eventId },
      refetch,
    });

    // assignee interaction
    const onAssigneesUpdate = useCallback(() => {
      if (refetch) {
        refetch();
      }
      if (refetchFlyoutData) {
        refetchFlyoutData();
      }
    }, [refetch, refetchFlyoutData]);
    const { alertAssigneesItems, alertAssigneesPanels } = useAlertAssigneesActions({
      closePopover: closePopoverHandler,
      ecsRowData: dataAsNestedObject ?? { _id: alertSummaryData.eventId },
      refetch: onAssigneesUpdate,
    });

    // timeline interaction
    const { investigateInTimelineActionItems } = useInvestigateInTimeline({
      ecsRowData: dataAsNestedObject,
      onInvestigateInTimelineAlertClick: closePopoverHandler,
    });

    // osquery interaction
    const osqueryAgentId = useMemo(
      () =>
        getAlertDetailsFieldValue(
          { category: 'agent', field: 'agent.id' },
          dataFormattedForFieldBrowser
        ),
      [dataFormattedForFieldBrowser]
    );
    const handleOnOsqueryClick = useCallback(() => {
      onOsqueryClick(osqueryAgentId);
      setIsPopoverOpen(false);
    }, [onOsqueryClick, setIsPopoverOpen, osqueryAgentId]);
    const osqueryActionItem = useMemo(
      () =>
        getOsqueryActionItem({
          handleClick: handleOnOsqueryClick,
        }),
      [handleOnOsqueryClick]
    );
    const { osquery } = useKibana().services;
    const osqueryAvailable = osquery?.isOsqueryAvailable({
      agentId: osqueryAgentId,
    });

    // alert action items
    const alertsActionItems = useMemo(
      () =>
        !isEvent && alertSummaryData.ruleId
          ? [
              ...statusActionItems,
              ...alertTagsItems,
              ...alertAssigneesItems,
              ...exceptionActionItems,
            ]
          : isEndpointEvent && canCreateEndpointEventFilters
          ? eventFilterActionItems
          : [],
      [
        eventFilterActionItems,
        isEndpointEvent,
        canCreateEndpointEventFilters,
        exceptionActionItems,
        statusActionItems,
        isEvent,
        alertSummaryData.ruleId,
        alertTagsItems,
        alertAssigneesItems,
      ]
    );

    // cases interaction
    const isInDetections = [TableId.alertsOnAlertsPage, TableId.alertsOnRuleDetailsPage].includes(
      scopeId as TableId
    );
    const { addToCaseActionItems, handleAddToNewCaseClick } = useAddToCaseActions({
      ecsData: dataAsNestedObject,
      nonEcsData:
        dataFormattedForFieldBrowser?.map((d) => ({ field: d.field, value: d.values })) ?? [],
      onMenuItemClick,
      onSuccess: refetchFlyoutData,
      isActiveTimelines: isActiveTimeline(scopeId),
      isInDetections,
      refetch,
    });

    // responder action items
    const endpointResponseActionsConsoleItems = useResponderActionItem(
      dataFormattedForFieldBrowser,
      closePopoverHandler
    );

    // items to render in the dropdown
    const items: AlertTableContextMenuItem[] = useMemo(
      () => [
        ...addToCaseActionItems,
        ...alertsActionItems,
        ...hostIsolationActionItems,
        ...endpointResponseActionsConsoleItems,
        ...(osqueryAvailable ? [osqueryActionItem] : []),
        ...investigateInTimelineActionItems,
      ],
      [
        addToCaseActionItems,
        alertsActionItems,
        hostIsolationActionItems,
        endpointResponseActionsConsoleItems,
        osqueryAvailable,
        osqueryActionItem,
        investigateInTimelineActionItems,
      ]
    );

    // panels rendered in the context menu
    const panels = [
      {
        id: 0,
        items,
      },
      ...alertTagsPanels,
      ...alertAssigneesPanels,
    ];

    const takeActionButton = useMemo(
      () => (
        <GuidedOnboardingTourStep
          onClick={handleAddToNewCaseClick}
          step={AlertsCasesTourSteps.addAlertToCase}
          tourId={SecurityStepId.alertsCases}
        >
          <EuiButton
            data-test-subj={FLYOUT_FOOTER_DEOPDOEN_BUTTON_TEST_ID}
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

    return items.length && dataAsNestedObject ? (
      <EuiPopover
        id="AlertTakeActionPanel"
        button={takeActionButton}
        isOpen={isPopoverOpen}
        closePopover={closePopoverHandler}
        panelPaddingSize="none"
        anchorPosition="downLeft"
        repositionOnScroll
      >
        <EuiContextMenu
          size="s"
          initialPanelId={0}
          panels={panels}
          data-test-subj="takeActionPanelMenu"
        />
      </EuiPopover>
    ) : null;
  }
);

TakeActionDropdown.displayName = 'TakeActionDropdown';
