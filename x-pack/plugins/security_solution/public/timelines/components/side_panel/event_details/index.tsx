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
import { TakeActionDropdown } from '../../../../detections/components/host_isolation/take_action_dropdown';
import {
  ISOLATE_HOST,
  UNISOLATE_HOST,
} from '../../../../detections/components/host_isolation/translations';
import { ALERT_DETAILS } from './translations';
import { useIsolationPrivileges } from '../../../../common/hooks/endpoint/use_isolate_privileges';

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

  const [isolateAction, setIsolateAction] = useState('isolateHost');

  const showAlertDetails = useCallback(() => {
    setIsHostIsolationPanel(false);
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
    const findEndpointAlert = find({ category: 'agent', field: 'agent.type' }, detailsData)?.values;
    return findEndpointAlert ? findEndpointAlert[0] === 'endpoint' : false;
  }, [detailsData]);

  const agentId = useMemo(() => {
    const findAgentId = find({ category: 'agent', field: 'agent.id' }, detailsData)?.values;
    return findAgentId ? findAgentId[0] : '';
  }, [detailsData]);

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
      <StyledEuiFlyoutBody>
        {isHostIsolationPanelOpen ? (
          <HostIsolationPanel
            details={detailsData}
            cancelCallback={showAlertDetails}
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
      {isIsolationAllowed && isEndpointAlert && isHostIsolationPanelOpen === false && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <TakeActionDropdown onChange={showHostIsolationPanel} agentId={agentId} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <EuiSpacer size="l" />
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
