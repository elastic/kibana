/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiButtonIcon, EuiContextMenuPanel, EuiPopover, EuiToolTip } from '@elastic/eui';
import { indexOf } from 'lodash';
import type { ConnectedProps } from 'react-redux';
import { connect } from 'react-redux';
import type { ExceptionListType } from '@kbn/securitysolution-io-ts-list-types';
import { get } from 'lodash/fp';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '@kbn/timelines-plugin/public';
import { useOsqueryContextActionItem } from '../../osquery/use_osquery_context_action_item';
import { OsqueryFlyout } from '../../osquery/osquery_flyout';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { buildGetAlertByIdQuery } from '../../../../common/components/exceptions/helpers';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EventsTdContent } from '../../../../timelines/components/timeline/styles';
import type { Ecs } from '../../../../../common/ecs';
import type { AddExceptionFlyoutProps } from '../../../../common/components/exceptions/add_exception_flyout';
import { AddExceptionFlyout } from '../../../../common/components/exceptions/add_exception_flyout';
import * as i18n from '../translations';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { TimelineId } from '../../../../../common/types';
import type { AlertData, EcsHit } from '../../../../common/components/exceptions/types';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { useSignalIndex } from '../../../containers/detection_engine/alerts/use_signal_index';
import { EventFiltersFlyout } from '../../../../management/pages/event_filters/view/components/event_filters_flyout';
import { useAlertsActions } from './use_alerts_actions';
import { useExceptionFlyout } from './use_add_exception_flyout';
import { useExceptionActions } from './use_add_exception_actions';
import { useEventFilterModal } from './use_event_filter_modal';
import type { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import { ATTACH_ALERT_TO_CASE_FOR_ROW } from '../../../../timelines/components/timeline/body/translations';
import { useEventFilterAction } from './use_event_filter_action';
import { useAddToCaseActions } from './use_add_to_case_actions';
import { isAlertFromEndpointAlert } from '../../../../common/utils/endpoint_alert_check';

interface AlertContextMenuProps {
  ariaLabel?: string;
  ariaRowindex: number;
  columnValues: string;
  disabled: boolean;
  ecsRowData: Ecs;
  refetch: inputsModel.Refetch;
  onRuleChange?: () => void;
  timelineId: string;
}

const AlertContextMenuComponent: React.FC<AlertContextMenuProps & PropsFromRedux> = ({
  ariaLabel = i18n.MORE_ACTIONS,
  ariaRowindex,
  columnValues,
  disabled,
  ecsRowData,
  refetch,
  onRuleChange,
  timelineId,
  globalQuery,
  timelineQuery,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [isOsqueryFlyoutOpen, setOsqueryFlyoutOpen] = useState(false);
  const [routeProps] = useRouteSpy();

  const onMenuItemClick = useCallback(() => {
    setPopover(false);
  }, []);
  const ruleId = get(0, ecsRowData?.kibana?.alert?.rule?.uuid);
  const ruleName = get(0, ecsRowData?.kibana?.alert?.rule?.name);

  const { addToCaseActionItems } = useAddToCaseActions({
    ecsData: ecsRowData,
    onMenuItemClick,
    timelineId,
    ariaLabel: ATTACH_ALERT_TO_CASE_FOR_ROW({ ariaRowindex, columnValues }),
  });

  const { loading: canAccessEndpointManagementLoading, canAccessEndpointManagement } =
    useUserPrivileges().endpointPrivileges;
  const canCreateEndpointEventFilters = useMemo(
    () => !canAccessEndpointManagementLoading && canAccessEndpointManagement,
    [canAccessEndpointManagement, canAccessEndpointManagementLoading]
  );

  const alertStatus = get(0, ecsRowData?.kibana?.alert?.workflow_status) as Status | undefined;

  const isEvent = useMemo(() => indexOf(ecsRowData.event?.kind, 'event') !== -1, [ecsRowData]);
  const isAgentEndpoint = useMemo(() => ecsRowData.agent?.type?.includes('endpoint'), [ecsRowData]);

  const isEndpointEvent = useMemo(() => isEvent && isAgentEndpoint, [isEvent, isAgentEndpoint]);
  const timelineIdAllowsAddEndpointEventFilter = useMemo(
    () => timelineId === TimelineId.hostsPageEvents || timelineId === TimelineId.usersPageEvents,
    [timelineId]
  );

  const onButtonClick = useCallback(() => {
    setPopover(!isPopoverOpen);
  }, [isPopoverOpen]);

  const closePopover = useCallback((): void => {
    setPopover(false);
  }, []);

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

  const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  };

  const refetchAll = useCallback(() => {
    if (timelineId === TimelineId.active) {
      refetchQuery([timelineQuery]);
      if (routeProps.pageName === 'alerts') {
        refetchQuery(globalQuery);
      }
    } else {
      refetchQuery(globalQuery);
    }
  }, [timelineId, globalQuery, timelineQuery, routeProps]);

  const ruleIndex =
    ecsRowData['kibana.alert.rule.parameters']?.index ?? ecsRowData?.signal?.rule?.index;

  const {
    exceptionFlyoutType,
    onAddExceptionCancel,
    onAddExceptionConfirm,
    onAddExceptionTypeClick,
    ruleIndices,
  } = useExceptionFlyout({
    ruleIndex,
    refetch: refetchAll,
    timelineId,
  });

  const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
    useEventFilterModal();

  const { actionItems: statusActionItems } = useAlertsActions({
    alertStatus,
    eventId: ecsRowData?._id,
    indexName: ecsRowData?._index ?? '',
    timelineId,
    refetch: refetchAll,
    closePopover,
  });

  const handleOnAddExceptionTypeClick = useCallback(
    (type: ExceptionListType) => {
      onAddExceptionTypeClick(type);
      closePopover();
    },
    [closePopover, onAddExceptionTypeClick]
  );

  const handleOnAddEventFilterClick = useCallback(() => {
    onAddEventFilterClick();
    closePopover();
  }, [closePopover, onAddEventFilterClick]);

  const { exceptionActionItems } = useExceptionActions({
    isEndpointAlert: isAlertFromEndpointAlert({ ecsData: ecsRowData }),
    onAddExceptionTypeClick: handleOnAddExceptionTypeClick,
  });
  const { eventFilterActionItems } = useEventFilterAction({
    onAddEventFilterClick: handleOnAddEventFilterClick,
    disabled:
      !isEndpointEvent || !canCreateEndpointEventFilters || !timelineIdAllowsAddEndpointEventFilter,
    tooltipMessage: !timelineIdAllowsAddEndpointEventFilter
      ? i18n.ACTION_ADD_EVENT_FILTER_DISABLED_TOOLTIP
      : undefined,
  });
  const agentId = useMemo(() => get(0, ecsRowData?.agent?.id), [ecsRowData]);

  const handleOnOsqueryClick = useCallback(() => {
    setOsqueryFlyoutOpen((prevValue) => !prevValue);
    setPopover(false);
  }, []);

  const { osqueryActionItems } = useOsqueryContextActionItem({ handleClick: handleOnOsqueryClick });

  const items: React.ReactElement[] = useMemo(
    () =>
      !isEvent && ruleId
        ? [
            ...addToCaseActionItems,
            ...statusActionItems,
            ...exceptionActionItems,
            ...(agentId ? osqueryActionItems : []),
          ]
        : [
            ...addToCaseActionItems,
            ...eventFilterActionItems,
            ...(agentId ? osqueryActionItems : []),
          ],
    [
      isEvent,
      ruleId,
      addToCaseActionItems,
      statusActionItems,
      exceptionActionItems,
      agentId,
      osqueryActionItems,
      eventFilterActionItems,
    ]
  );

  return (
    <>
      {items.length > 0 && (
        <div key="actions-context-menu">
          <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH}>
            <EuiPopover
              id="singlePanel"
              button={button}
              isOpen={isPopoverOpen}
              closePopover={closePopover}
              panelPaddingSize="none"
              anchorPosition="downLeft"
              repositionOnScroll
            >
              <EuiContextMenuPanel size="s" items={items} />
            </EuiPopover>
          </EventsTdContent>
        </div>
      )}
      {exceptionFlyoutType != null &&
        ruleId != null &&
        ruleName != null &&
        ecsRowData?._id != null && (
          <AddExceptionFlyoutWrapper
            ruleName={ruleName}
            ruleId={ruleId}
            ruleIndices={ruleIndices}
            exceptionListType={exceptionFlyoutType}
            eventId={ecsRowData?._id}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
            alertStatus={alertStatus}
            onRuleChange={onRuleChange}
          />
        )}
      {isAddEventFilterModalOpen && ecsRowData != null && (
        <EventFiltersFlyout data={ecsRowData} onCancel={closeAddEventFilterModal} />
      )}
      {isOsqueryFlyoutOpen && agentId && ecsRowData != null && (
        <OsqueryFlyout agentId={agentId} onClose={handleOnOsqueryClick} />
      )}
    </>
  );
};

const makeMapStateToProps = () => {
  const getGlobalQueries = inputsSelectors.globalQuery();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { timelineId }: AlertContextMenuProps) => {
    return {
      globalQuery: getGlobalQueries(state),
      timelineQuery: getTimelineQuery(state, timelineId),
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertContextMenu = connector(React.memo(AlertContextMenuComponent));

type AddExceptionFlyoutWrapperProps = Omit<
  AddExceptionFlyoutProps,
  'alertData' | 'isAlertDataLoading'
> & {
  eventId?: string;
};

/**
 * This component exists to fetch needed data outside of the AddExceptionFlyout
 * Due to the conditional nature of the flyout and how we use the `ecsData` field,
 * we cannot use the fetch hook within the flyout component itself
 */
export const AddExceptionFlyoutWrapper: React.FC<AddExceptionFlyoutWrapperProps> = ({
  ruleName,
  ruleId,
  ruleIndices,
  exceptionListType,
  eventId,
  onCancel,
  onConfirm,
  alertStatus,
  onRuleChange,
}) => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const { loading: isLoadingAlertData, data } = useQueryAlerts<EcsHit, {}>({
    query: buildGetAlertByIdQuery(eventId),
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

  /**
   * This should be re-visited after UEBA work is merged
   */
  const memoRuleIndices = useMemo(() => {
    if (enrichedAlert != null && enrichedAlert['kibana.alert.rule.parameters']?.index != null) {
      return Array.isArray(enrichedAlert['kibana.alert.rule.parameters'].index)
        ? enrichedAlert['kibana.alert.rule.parameters'].index
        : [enrichedAlert['kibana.alert.rule.parameters'].index];
    } else if (enrichedAlert != null && enrichedAlert?.signal?.rule?.index != null) {
      return Array.isArray(enrichedAlert.signal.rule.index)
        ? enrichedAlert.signal.rule.index
        : [enrichedAlert.signal.rule.index];
    }
    return [];
  }, [enrichedAlert]);

  const memoDataViewId = useMemo(() => {
    if (
      enrichedAlert != null &&
      enrichedAlert['kibana.alert.rule.parameters']?.data_view_id != null
    ) {
      return enrichedAlert['kibana.alert.rule.parameters'].data_view_id;
    }
  }, [enrichedAlert]);

  const isLoading = isLoadingAlertData && isSignalIndexLoading;

  return (
    <AddExceptionFlyout
      ruleName={ruleName}
      ruleId={ruleId}
      ruleIndices={memoRuleIndices}
      dataViewId={memoDataViewId}
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
