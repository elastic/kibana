/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme, EuiFlyoutFooter, EuiPanel } from '@elastic/eui';
import { find } from 'lodash/fp';
import { FLYOUT_FOOTER_TEST_ID } from './test_ids';
import type { Status } from '../../../../common/api/detection_engine';
import { getAlertDetailsFieldValue } from '../../../common/lib/endpoint/utils/get_event_details_field_values';
import { TakeActionDropdown } from './components/take_action_dropdown';
import { AddExceptionFlyoutWrapper } from '../../../detections/components/alerts_table/timeline_actions/alert_context_menu';
import { EventFiltersFlyout } from '../../../management/pages/event_filters/view/components/event_filters_flyout';
import { OsqueryFlyout } from '../../../detections/components/osquery/osquery_flyout';
import { useDocumentDetailsContext } from '../shared/context';
import { useHostIsolation } from '../shared/hooks/use_host_isolation';
import { DocumentDetailsIsolateHostPanelKey } from '../shared/constants/panel_keys';
import { useRefetchByScope } from './hooks/use_refetch_by_scope';
import { useExceptionFlyout } from '../../../detections/components/alerts_table/timeline_actions/use_add_exception_flyout';
import { isActiveTimeline } from '../../../helpers';
import { useEventFilterModal } from '../../../detections/components/alerts_table/timeline_actions/use_event_filter_modal';

interface AlertSummaryData {
  /**
   * Status of the alert (open, closed...)
   */
  alertStatus: Status;
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * Id of the rule
   */
  ruleId: string;
  /**
   * Property ruleId on the rule
   */
  ruleRuleId: string;
  /**
   * Name of the rule
   */
  ruleName: string;
}

interface PanelFooterProps {
  /**
   * Boolean that indicates whether flyout is in preview and action should be hidden
   */
  isPreview: boolean;
}

/**
 * Bottom section of the flyout that contains the take action button
 */
export const PanelFooter: FC<PanelFooterProps> = ({ isPreview }) => {
  const { euiTheme } = useEuiTheme();
  // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
  const flyoutZIndex = useMemo(
    () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 3}` }),
    [euiTheme]
  );

  const { closeFlyout, openRightPanel } = useExpandableFlyoutApi();
  const {
    eventId,
    indexName,
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
    refetchFlyoutData,
    scopeId,
  } = useDocumentDetailsContext();

  // host isolation interaction
  const { isHostIsolationPanelOpen, showHostIsolationPanel } = useHostIsolation();
  const showHostIsolationPanelCallback = useCallback(
    (action: 'isolateHost' | 'unisolateHost' | undefined) => {
      showHostIsolationPanel(action);
      openRightPanel({
        id: DocumentDetailsIsolateHostPanelKey,
        params: {
          id: eventId,
          indexName,
          scopeId,
          isolateAction: action,
        },
      });
    },
    [eventId, indexName, openRightPanel, scopeId, showHostIsolationPanel]
  );

  const { refetch: refetchAll } = useRefetchByScope({ scopeId });

  // exception interaction
  const ruleIndexRaw = useMemo(
    () =>
      find({ category: 'signal', field: 'signal.rule.index' }, dataFormattedForFieldBrowser)
        ?.values ??
      find(
        { category: 'kibana', field: 'kibana.alert.rule.parameters.index' },
        dataFormattedForFieldBrowser
      )?.values,
    [dataFormattedForFieldBrowser]
  );
  const ruleIndex = useMemo(
    (): string[] | undefined => (Array.isArray(ruleIndexRaw) ? ruleIndexRaw : undefined),
    [ruleIndexRaw]
  );
  const ruleDataViewIdRaw = useMemo(
    () =>
      find({ category: 'signal', field: 'signal.rule.data_view_id' }, dataFormattedForFieldBrowser)
        ?.values ??
      find(
        { category: 'kibana', field: 'kibana.alert.rule.parameters.data_view_id' },
        dataFormattedForFieldBrowser
      )?.values,
    [dataFormattedForFieldBrowser]
  );
  const ruleDataViewId = useMemo(
    (): string | undefined => (Array.isArray(ruleDataViewIdRaw) ? ruleDataViewIdRaw[0] : undefined),
    [ruleDataViewIdRaw]
  );
  const alertSummaryData = useMemo(
    () =>
      [
        { category: 'signal', field: 'signal.rule.id', name: 'ruleId' },
        { category: 'signal', field: 'signal.rule.rule_id', name: 'ruleRuleId' },
        { category: 'signal', field: 'signal.rule.name', name: 'ruleName' },
        { category: 'signal', field: 'kibana.alert.workflow_status', name: 'alertStatus' },
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
  const {
    exceptionFlyoutType,
    openAddExceptionFlyout,
    onAddExceptionTypeClick,
    onAddExceptionCancel,
    onAddExceptionConfirm,
  } = useExceptionFlyout({
    refetch: refetchAll,
    isActiveTimelines: isActiveTimeline(scopeId),
  });

  // event filter interaction
  const { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick } =
    useEventFilterModal();

  // osquery interaction
  const [isOsqueryFlyoutOpenWithAgentId, setOsqueryFlyoutOpenWithAgentId] = useState<null | string>(
    null
  );
  const closeOsqueryFlyout = useCallback(() => {
    setOsqueryFlyoutOpenWithAgentId(null);
  }, [setOsqueryFlyoutOpenWithAgentId]);
  const alertId = useMemo(
    () => (dataAsNestedObject?.kibana?.alert ? dataAsNestedObject?._id : null),
    [dataAsNestedObject?._id, dataAsNestedObject?.kibana?.alert]
  );

  if (isPreview) return null;

  return (
    <>
      <EuiFlyoutFooter data-test-subj={FLYOUT_FOOTER_TEST_ID}>
        <EuiPanel color="transparent">
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              {dataAsNestedObject && (
                <TakeActionDropdown
                  dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
                  dataAsNestedObject={dataAsNestedObject}
                  handleOnEventClosed={closeFlyout}
                  isHostIsolationPanelOpen={isHostIsolationPanelOpen}
                  onAddEventFilterClick={onAddEventFilterClick}
                  onAddExceptionTypeClick={onAddExceptionTypeClick}
                  onAddIsolationStatusClick={showHostIsolationPanelCallback}
                  refetchFlyoutData={refetchFlyoutData}
                  refetch={refetchAll}
                  scopeId={scopeId}
                  onOsqueryClick={setOsqueryFlyoutOpenWithAgentId}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>

      {openAddExceptionFlyout &&
        alertSummaryData.ruleId != null &&
        alertSummaryData.ruleRuleId != null &&
        alertSummaryData.eventId != null && (
          <AddExceptionFlyoutWrapper
            {...alertSummaryData}
            ruleIndices={ruleIndex}
            ruleDataViewId={ruleDataViewId}
            exceptionListType={exceptionFlyoutType}
            onCancel={onAddExceptionCancel}
            onConfirm={onAddExceptionConfirm}
          />
        )}

      {isAddEventFilterModalOpen && dataAsNestedObject != null && (
        <EventFiltersFlyout
          data={dataAsNestedObject}
          onCancel={closeAddEventFilterModal}
          // EUI TODO: This z-index override of EuiOverlayMask is a workaround, and ideally should be resolved with a cleaner UI/UX flow long-term
          maskProps={flyoutZIndex} // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
        />
      )}

      {isOsqueryFlyoutOpenWithAgentId && dataAsNestedObject != null && (
        <OsqueryFlyout
          agentId={isOsqueryFlyoutOpenWithAgentId}
          defaultValues={alertId ? { alertIds: [alertId] } : undefined}
          onClose={closeOsqueryFlyout}
          ecsData={dataAsNestedObject}
        />
      )}
    </>
  );
};

PanelFooter.displayName = 'PanelFooter';
