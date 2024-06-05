/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import { indexOf } from 'lodash';
import { useSelector } from 'react-redux';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { get } from 'lodash/fp';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { TableId } from '@kbn/securitysolution-data-table';
import { useRuleWithFallback } from '../../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '../../../../common/components/header_actions';
import { isActiveTimeline } from '../../../../helpers';
import { useOsqueryContextActionItem } from '../../osquery/use_osquery_context_action_item';
import { OsqueryFlyout } from '../../osquery/osquery_flyout';
import { buildGetAlertByIdQuery } from '../../../../detection_engine/rule_exceptions/utils/helpers';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { EventsTdContent } from '../../../../timelines/components/timeline/styles';
import type { AddExceptionFlyoutProps } from '../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import { AddExceptionFlyout } from '../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import * as i18n from '../translations';
import type { inputsModel, State } from '../../../../common/store';
import { inputsSelectors } from '../../../../common/store';
import type { AlertData, EcsHit } from '../../../../detection_engine/rule_exceptions/utils/types';
import { useQueryAlerts } from '../../../containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../containers/detection_engine/alerts/constants';
import { useSignalIndex } from '../../../containers/detection_engine/alerts/use_signal_index';
import { EventFiltersFlyout } from '../../../../management/pages/event_filters/view/components/event_filters_flyout';
import { useAlertsActions } from './use_alerts_actions';
import { useExceptionFlyout } from './use_add_exception_flyout';
import { useAlertExceptionActions } from './use_add_exception_actions';
import { useEventFilterModal } from './use_event_filter_modal';
import type {
  DataViewId,
  IndexPatternArray,
  RuleObjectId,
  RuleSignatureId,
  Status,
} from '../../../../../common/api/detection_engine';
import { ATTACH_ALERT_TO_CASE_FOR_ROW } from '../../../../timelines/components/timeline/body/translations';
import { useEventFilterAction } from './use_event_filter_action';
import { useAddToCaseActions } from './use_add_to_case_actions';
import { isAlertFromEndpointAlert } from '../../../../common/utils/endpoint_alert_check';
import type { Rule } from '../../../../detection_engine/rule_management/logic/types';
import type { AlertTableContextMenuItem } from '../types';
import { useAlertTagsActions } from './use_alert_tags_actions';
import { useAlertAssigneesActions } from './use_alert_assignees_actions';

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

const AlertContextMenuComponent: React.FC<AlertContextMenuProps> = ({
  ariaLabel = i18n.MORE_ACTIONS,
  ariaRowindex,
  columnValues,
  disabled,
  ecsRowData,
  onRuleChange,
  scopeId,
  refetch,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);
  const [isOsqueryFlyoutOpen, setOsqueryFlyoutOpen] = useState(false);

  const onMenuItemClick = useCallback(() => {
    setPopover(false);
  }, []);

  const getGlobalQueries = useMemo(() => inputsSelectors.globalQuery(), []);
  const getTimelineQuery = useMemo(() => inputsSelectors.timelineQueryByIdSelector(), []);
  const globalQuery = useSelector((state: State) => getGlobalQueries(state));
  const timelineQuery = useSelector((state: State) => getTimelineQuery(state, scopeId));

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
    refetch,
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

  const refetchAll = useCallback(() => {
    const refetchQuery = (newQueries: inputsModel.GlobalQuery[]) => {
      newQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
    };
    if (isActiveTimeline(scopeId ?? '')) {
      refetchQuery([timelineQuery]);
    } else {
      refetchQuery(globalQuery);
      if (refetch) refetch();
    }
  }, [scopeId, globalQuery, timelineQuery, refetch]);

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

  const { exceptionActionItems } = useAlertExceptionActions({
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

  const { alertTagsItems, alertTagsPanels } = useAlertTagsActions({
    closePopover,
    ecsRowData,
    refetch: refetchAll,
  });

  const { alertAssigneesItems, alertAssigneesPanels } = useAlertAssigneesActions({
    closePopover,
    ecsRowData,
    refetch: refetchAll,
  });

  const items: AlertTableContextMenuItem[] = useMemo(
    () =>
      !isEvent && ruleId
        ? [
            ...addToCaseActionItems,
            ...statusActionItems,
            ...alertTagsItems,
            ...alertAssigneesItems,
            ...exceptionActionItems,
            ...(agentId ? osqueryActionItems : []),
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
      eventFilterActionItems,
      canCreateEndpointEventFilters,
      alertTagsItems,
      alertAssigneesItems,
    ]
  );

  const panels = useMemo(
    () => [
      {
        id: 0,
        items,
      },
      ...alertTagsPanels,
      ...alertAssigneesPanels,
    ],
    [alertTagsPanels, alertAssigneesPanels, items]
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
              <EuiContextMenu
                size="s"
                initialPanelId={0}
                panels={panels}
                data-test-subj="actions-context-menu"
              />
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

export const AlertContextMenu = React.memo(AlertContextMenuComponent);

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
  ruleId: RuleObjectId;
  ruleRuleId: RuleSignatureId;
  ruleIndices: IndexPatternArray | undefined;
  ruleDataViewId: DataViewId | undefined;
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
  const { rule: maybeRule, loading: isRuleLoading } = useRuleWithFallback(ruleId);

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

  const memoRule = useMemo(() => {
    if (maybeRule) {
      return [maybeRule];
    }

    return null;
  }, [maybeRule]);

  const ruleType = enrichedAlert?.['kibana.alert.rule.parameters']?.type;
  const isAlertWithoutIndex = ruleType === 'esql' || ruleType === 'machine_learning';
  const isWaitingForIndexOrDataView =
    !isAlertWithoutIndex && memoRuleIndices == null && memoDataViewId == null;

  const isLoading =
    (isLoadingAlertData && isSignalIndexLoading) ||
    enrichedAlert == null ||
    isWaitingForIndexOrDataView;

  if (isLoading || isRuleLoading) return null;

  return (
    <AddExceptionFlyout
      rules={memoRule}
      isEndpointItem={exceptionListType === ExceptionListTypeEnum.ENDPOINT}
      alertData={enrichedAlert}
      isAlertDataLoading={isLoading || isRuleLoading}
      alertStatus={alertStatus}
      isBulkAction={false}
      showAlertCloseOptions
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
