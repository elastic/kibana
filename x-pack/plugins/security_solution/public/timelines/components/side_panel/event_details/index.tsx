/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, some } from 'lodash/fp';
import {
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { ExpandableEvent, ExpandableEventTitle } from './expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { HostIsolationPanel } from '../../../../detections/components/host_isolation';
import { EndpointIsolateSuccess } from '../../../../common/components/endpoint/host_isolation';
import { TakeActionDropdown } from '../../../../detections/components/host_isolation/take_action_dropdown';
import {
  ISOLATE_HOST,
  UNISOLATE_HOST,
} from '../../../../detections/components/host_isolation/translations';
import { ALERT_DETAILS } from './translations';
import { useIsolationPrivileges } from '../../../../common/hooks/endpoint/use_isolate_privileges';
import { isIsolationSupported } from '../../../../../common/endpoint/service/host_isolation/utils';
import { endpointAlertCheck } from '../../../../common/utils/endpoint_alert_check';
import { useWithCaseDetailsRefresh } from '../../../../common/components/endpoint/host_isolation/endpoint_host_isolation_cases_context';

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow: hidden;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow: hidden;
      padding: ${({ theme }) => `${theme.eui.paddingSizes.xs} ${theme.eui.paddingSizes.m} 50px`};
    }
  }
`;

interface EventDetailsPanelProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  expandedEvent: { eventId: string; indexName: string };
  handleOnEventClosed: () => void;
  isFlyoutView?: boolean;
  tabType: TimelineTabs;
  timelineId: string;
}

const EventDetailsPanelComponent: React.FC<EventDetailsPanelProps> = ({
  browserFields,
  docValueFields,
  expandedEvent,
  handleOnEventClosed,
  isFlyoutView,
  tabType,
  timelineId,
}) => {
  const [loading, detailsData] = useTimelineEventsDetails({
    docValueFields,
    indexName: expandedEvent.indexName ?? '',
    eventId: expandedEvent.eventId ?? '',
    skip: !expandedEvent.eventId,
  });

  const [isHostIsolationPanelOpen, setIsHostIsolationPanel] = useState(false);

  const [isolateAction, setIsolateAction] = useState<'isolateHost' | 'unisolateHost'>(
    'isolateHost'
  );

  const [isIsolateActionSuccessBannerVisible, setIsIsolateActionSuccessBannerVisible] = useState(
    false
  );

  const showAlertDetails = useCallback(() => {
    setIsHostIsolationPanel(false);
    setIsIsolateActionSuccessBannerVisible(false);
  }, []);

  const { isAllowed: isIsolationAllowed } = useIsolationPrivileges();
  const showHostIsolationPanel = useCallback((action) => {
    if (action === 'isolateHost' || action === 'unisolateHost') {
      setIsHostIsolationPanel(true);
      setIsolateAction(action);
    }
  }, []);

  const isAlert = some({ category: 'signal', field: 'signal.rule.id' }, detailsData);

  const isEndpointAlert = useMemo(() => {
    return endpointAlertCheck({ data: detailsData || [] });
  }, [detailsData]);

  const agentId = useMemo(() => {
    const findAgentId = find({ category: 'agent', field: 'agent.id' }, detailsData)?.values;
    return findAgentId ? findAgentId[0] : '';
  }, [detailsData]);

  const hostOsFamily = useMemo(() => {
    const findOsName = find({ category: 'host', field: 'host.os.name' }, detailsData)?.values;
    return findOsName ? findOsName[0] : '';
  }, [detailsData]);

  const agentVersion = useMemo(() => {
    const findAgentVersion = find({ category: 'agent', field: 'agent.version' }, detailsData)
      ?.values;
    return findAgentVersion ? findAgentVersion[0] : '';
  }, [detailsData]);

  const alertId = useMemo(() => {
    const findAlertId = find({ category: '_id', field: '_id' }, detailsData)?.values;
    return findAlertId ? findAlertId[0] : '';
  }, [detailsData]);

  const hostName = useMemo(() => {
    const findHostName = find({ category: 'host', field: 'host.name' }, detailsData)?.values;
    return findHostName ? findHostName[0] : '';
  }, [detailsData]);

  const isolationSupported = isIsolationSupported({
    osName: hostOsFamily,
    version: agentVersion,
  });

  const backToAlertDetailsLink = useMemo(() => {
    return (
      <>
        <EuiButtonEmpty
          iconType="arrowLeft"
          iconSide="left"
          flush="left"
          onClick={() => showAlertDetails()}
        >
          <EuiText size="xs">
            <p>{ALERT_DETAILS}</p>
          </EuiText>
        </EuiButtonEmpty>
        <EuiTitle>
          <h2>{isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST}</h2>
        </EuiTitle>
      </>
    );
  }, [showAlertDetails, isolateAction]);

  const caseDetailsRefresh = useWithCaseDetailsRefresh();

  const handleIsolationActionSuccess = useCallback(() => {
    setIsIsolateActionSuccessBannerVisible(true);
    // If a case details refresh ref is defined, then refresh actions and comments
    if (caseDetailsRefresh) {
      caseDetailsRefresh.refreshUserActionsAndComments();
    }
  }, [caseDetailsRefresh]);

  if (!expandedEvent?.eventId) {
    return null;
  }

  return isFlyoutView ? (
    <>
      <EuiFlyoutHeader hasBorder>
        {isHostIsolationPanelOpen ? (
          backToAlertDetailsLink
        ) : (
          <ExpandableEventTitle isAlert={isAlert} loading={loading} />
        )}
      </EuiFlyoutHeader>
      {isIsolateActionSuccessBannerVisible && (
        <EndpointIsolateSuccess
          hostName={hostName}
          alertId={alertId}
          isolateAction={isolateAction}
        />
      )}
      <StyledEuiFlyoutBody>
        {isHostIsolationPanelOpen ? (
          <HostIsolationPanel
            details={detailsData}
            cancelCallback={showAlertDetails}
            successCallback={handleIsolationActionSuccess}
            isolateAction={isolateAction}
          />
        ) : (
          <ExpandableEvent
            browserFields={browserFields}
            detailsData={detailsData}
            event={expandedEvent}
            isAlert={isAlert}
            loading={loading}
            timelineId={timelineId}
            timelineTabType="flyout"
          />
        )}
      </StyledEuiFlyoutBody>
      {isIsolationAllowed &&
        isEndpointAlert &&
        isolationSupported &&
        isHostIsolationPanelOpen === false && (
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <TakeActionDropdown onChange={showHostIsolationPanel} agentId={agentId} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        )}
    </>
  ) : (
    <>
      <ExpandableEventTitle
        isAlert={isAlert}
        loading={loading}
        handleOnEventClosed={handleOnEventClosed}
      />
      <EuiSpacer size="m" />
      <ExpandableEvent
        browserFields={browserFields}
        detailsData={detailsData}
        event={expandedEvent}
        isAlert={isAlert}
        loading={loading}
        timelineId={timelineId}
        timelineTabType={tabType}
      />
    </>
  );
};

export const EventDetailsPanel = React.memo(
  EventDetailsPanelComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.docValueFields, nextProps.docValueFields) &&
    deepEqual(prevProps.expandedEvent, nextProps.expandedEvent) &&
    prevProps.timelineId === nextProps.timelineId
);
