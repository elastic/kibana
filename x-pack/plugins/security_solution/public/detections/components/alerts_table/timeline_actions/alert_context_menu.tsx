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
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { get } from 'lodash/fp';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '../../../../common/components/header_actions';
import { isActiveTimeline } from '../../../../helpers';
import { useOsqueryContextActionItem } from '../../osquery/use_osquery_context_action_item';
import { OsqueryFlyout } from '../../osquery/osquery_flyout';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { buildGetAlertByIdQuery } from '../../../../detection_engine/rule_exceptions/utils/helpers';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EventsTdContent } from '../../../../timelines/components/timeline/styles';
import type { AddExceptionFlyoutProps } from '../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import { AddExceptionFlyout } from '../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import * as i18n from '../translations';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import { TableId } from '../../../../../common/types';
import type { AlertData, EcsHit } from '../../../../detection_engine/rule_exceptions/utils/types';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../containers/detection_engine/alerts/constants';
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
import type { Rule } from '../../../../detection_engine/rule_management/logic/types';
import { useOpenAlertDetailsAction } from './use_open_alert_details';

interface AlertContextMenuProps {
  ariaLabel?: string;
  ariaRowindex: number;
  columnValues: string;
  disabled: boolean;
  ecsRowData: Ecs;
  onRuleChange?: () => void;
  scopeId: string;
  refetch: (() => void) | undefined;
}

const AlertContextMenuComponent: React.FC<AlertContextMenuProps & PropsFromRedux> = ({
  ariaLabel = i18n.MORE_ACTIONS,
  ariaRowindex,
  columnValues,
  disabled,
  ecsRowData,
  onRuleChange,
  scopeId,
  globalQuery,
  timelineQuery,
  refetch,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [isOsqueryFlyoutOpen, setOsqueryFlyoutOpen] = useState(false);
  const [routeProps] = useRouteSpy();

  const onMenuItemClick = useCallback(() => {
    setPopover(false);
  }, []);

  const getAlertId = () => (ecsRowData?.kibana?.alert ? ecsRowData?._id : null);
  const alertId = getAlertId();
  const ruleId = get(0, ecsRowData?.kibana?.alert?.rule?.uuid);
  const ruleRuleId = get(0, ecsRowData?.kibana?.alert?.rule?.rule_id);
  const ruleName = get(0, ecsRowData?.kibana?.alert?.rule?.name);
  const isInDetections = [TableId.alertsOnAlertsPage, TableId.alertsOnRuleDetailsPage].includes(
    scopeId as TableId
  );

  const { addToCaseActionItems } = useAddToCaseActions({
    ecsData: ecsRowData,
    onMenuItemClick,
    isActiveTimelines: isActiveTimeline(scopeId ?? ''),
    ariaLabel: ATTACH_ALERT_TO_CASE_FOR_ROW({ ariaRowindex, columnValues }),
    isInDetections,
  });

  const { loading: endpointPrivilegesLoading, canWriteEventFilters } =
    useUserPrivileges().endpointPrivileges;
  const canCreateEndpointEventFilters = useMemo(
    () => !endpointPrivilegesLoading && canWriteEventFilters,
    [canWriteEventFilters, endpointPrivilegesLoading]
  );

  const alertStatus = get(0, ecsRowData?.kibana?.alert?.workflow_status) as Status | undefined;

  const isEvent = useMemo(() => indexOf(ecsRowData.event?.kind, 'event') !== -1, [ecsRowData]);
  const isAgentEndpoint = useMemo(() => ecsRowData.agent?.type?.includes('endpoint'), [ecsRowData]);
  const isEndpointEvent = useMemo(() => isEvent && isAgentEndpoint, [isEvent, isAgentEndpoint]);
  const scopeIdAllowsAddEndpointEventFilter = useMemo(
    () => scopeId === TableId.hostsPageEvents || scopeId === TableId.usersPageEvents,
    [scopeId]
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
          data-popover-open={isPopoverOpen}
          onClick={onButtonClick}
          isDisabled={disabled}
        />
      </EuiToolTip>
    );
  }, [disabled, onButtonClick, ariaLabel, isPopoverOpen]);

  const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
    newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  };

  const refetchAll = useCallback(() => {
    if (isActiveTimeline(scopeId ?? '')) {
      refetchQuery([timelineQuery]);
      if (routeProps.pageName === 'alerts') {
        refetchQuery(globalQuery);
      }
    } else {
      refetchQuery(globalQuery);
      if (refetch) refetch();
    }
  }, [scopeId, globalQuery, timelineQuery, routeProps, refetch]);

  const ruleIndex =
    ecsRowData['kibana.alert.rule.parameters']?.index ?? ecsRowData?.signal?.rule?.index;
  const ruleDataViewId =
    ecsRowData['kibana.alert.rule.parameters']?.data_view_id ??
    ecsRowData?.signal?.rule?.data_view_id;

  const {
    exceptionFlyoutType,
    openAddExceptionFlyout,
    onAddExceptionCancel,
    onAddExceptionConfirm,
    onAddExceptionTypeClick,
  } = useExceptionFlyout({
    refetch: refetchAll,
    onRuleChange,
    isActiveTimelines: isActiveTimeline(scopeId ?? ''),
  });

  const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
    useEventFilterModal();

  const { actionItems: statusActionItems } = useAlertsActions({
    alertStatus,
    eventId: ecsRowData?._id,
    indexName: ecsRowData?._index ?? '',
    scopeId,
    refetch: refetchAll,
    closePopover,
  });

  const handleOnAddExceptionTypeClick = useCallback(
    (type?: ExceptionListTypeEnum) => {
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
    disabled: !isEndpointEvent || !scopeIdAllowsAddEndpointEventFilter,
    tooltipMessage: !scopeIdAllowsAddEndpointEventFilter
      ? i18n.ACTION_ADD_EVENT_FILTER_DISABLED_TOOLTIP
      : undefined,
  });
  const agentId = useMemo(() => get(0, ecsRowData?.agent?.id), [ecsRowData]);

  const handleOnOsqueryClick = useCallback(() => {
    setOsqueryFlyoutOpen((prevValue) => !prevValue);
    setPopover(false);
  }, []);

  const { osqueryActionItems } = useOsqueryContextActionItem({ handleClick: handleOnOsqueryClick });

  const { alertDetailsActionItems } = useOpenAlertDetailsAction({
    alertId,
    closePopover,
    ruleId,
  });

  const items: React.ReactElement[] = useMemo(
    () =>
      !isEvent && ruleId
        ? [
            ...addToCaseActionItems,
            ...statusActionItems,
            ...exceptionActionItems,
            ...(agentId ? osqueryActionItems : []),
            ...alertDetailsActionItems,
          ]
        : [
            ...addToCaseActionItems,
            ...(canCreateEndpointEventFilters ? eventFilterActionItems : []),
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
      alertDetailsActionItems,
      eventFilterActionItems,
      canCreateEndpointEventFilters,
    ]
  );

  const osqueryFlyout = useMemo(() => {
    return (
      <OsqueryFlyout
        agentId={agentId}
        defaultValues={alertId ? { alertIds: [alertId] } : undefined}
        onClose={handleOnOsqueryClick}
        ecsData={ecsRowData}
      />
    );
  }, [agentId, alertId, ecsRowData, handleOnOsqueryClick]);

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
              <EuiContextMenuPanel size="s" items={items} data-test-subj="actions-context-menu" />
            </EuiPopover>
          </EventsTdContent>
        </div>
      )}
      {openAddExceptionFlyout &&
        ruleId &&
        ruleRuleId &&
        ruleName != null &&
        ecsRowData?._id != null && (
          <AddExceptionFlyoutWrapper
            ruleId={ruleId}
            ruleRuleId={ruleRuleId}
            ruleIndices={ruleIndex}
            ruleDataViewId={ruleDataViewId}
            ruleName={ruleName}
            exceptionListType={exceptionFlyoutType}
            eventId={ecsRowData?._id}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
            alertStatus={alertStatus}
          />
        )}
      {isAddEventFilterModalOpen && ecsRowData != null && (
        <EventFiltersFlyout data={ecsRowData} onCancel={closeAddEventFilterModal} />
      )}
      {isOsqueryFlyoutOpen && agentId && ecsRowData != null && osqueryFlyout}
    </>
  );
};

const makeMapStateToProps = () => {
  const getGlobalQueries = inputsSelectors.globalQuery();
  const getTimelineQuery = inputsSelectors.timelineQueryByIdSelector();
  const mapStateToProps = (state: State, { scopeId }: AlertContextMenuProps) => {
    return {
      globalQuery: getGlobalQueries(state),
      timelineQuery: getTimelineQuery(state, scopeId),
    };
  };
  return mapStateToProps;
};

const connector = connect(makeMapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

export const AlertContextMenu = connector(React.memo(AlertContextMenuComponent));

type AddExceptionFlyoutWrapperProps = Omit<
  AddExceptionFlyoutProps,
  | 'alertData'
  | 'isAlertDataLoading'
  | 'isEndpointItem'
  | 'rules'
  | 'isBulkAction'
  | 'showAlertCloseOptions'
> & {
  eventId?: string;
  ruleId: Rule['id'];
  ruleRuleId: Rule['rule_id'];
  ruleIndices: Rule['index'];
  ruleDataViewId: Rule['data_view_id'];
  ruleName: Rule['name'];
  exceptionListType: ExceptionListTypeEnum | null;
};

/**
 * This component exists to fetch needed data outside of the AddExceptionFlyout
 * Due to the conditional nature of the flyout and how we use the `ecsData` field,
 * we cannot use the fetch hook within the flyout component itself
 */
export const AddExceptionFlyoutWrapper: React.FC<AddExceptionFlyoutWrapperProps> = ({
  ruleId,
  ruleRuleId,
  ruleIndices,
  ruleDataViewId,
  ruleName,
  exceptionListType,
  eventId,
  onCancel,
  onConfirm,
  alertStatus,
}) => {
  const { loading: isSignalIndexLoading, signalIndexName } = useSignalIndex();

  const { loading: isLoadingAlertData, data } = useQueryAlerts<EcsHit, {}>({
    query: buildGetAlertByIdQuery(eventId),
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.ADD_EXCEPTION_FLYOUT,
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
    return ruleIndices;
  }, [enrichedAlert, ruleIndices]);

  const memoDataViewId = useMemo(() => {
    if (
      enrichedAlert != null &&
      enrichedAlert['kibana.alert.rule.parameters']?.data_view_id != null
    ) {
      return enrichedAlert['kibana.alert.rule.parameters'].data_view_id;
    }

    return ruleDataViewId;
  }, [enrichedAlert, ruleDataViewId]);

  // TODO: Do we want to notify user when they are working off of an older version of a rule
  // if they select to add an exception from an alert referencing an older rule version?
  const memoRule = useMemo(() => {
    if (enrichedAlert != null && enrichedAlert['kibana.alert.rule.parameters'] != null) {
      return [
        {
          ...enrichedAlert['kibana.alert.rule.parameters'],
          id: ruleId,
          rule_id: ruleRuleId,
          name: ruleName,
          index: memoRuleIndices,
          data_view_id: memoDataViewId,
        },
      ] as Rule[];
    }

    return [
      {
        id: ruleId,
        rule_id: ruleRuleId,
        name: ruleName,
        index: memoRuleIndices,
        data_view_id: memoDataViewId,
      },
    ] as Rule[];
  }, [enrichedAlert, memoDataViewId, memoRuleIndices, ruleId, ruleName, ruleRuleId]);

  const isLoading =
    (isLoadingAlertData && isSignalIndexLoading) ||
    enrichedAlert == null ||
    (memoRuleIndices == null && memoDataViewId == null);

  return (
    <AddExceptionFlyout
      rules={memoRule}
      isEndpointItem={exceptionListType === ExceptionListTypeEnum.ENDPOINT}
      alertData={enrichedAlert}
      isAlertDataLoading={isLoading}
      alertStatus={alertStatus}
      isBulkAction={false}
      showAlertCloseOptions
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
