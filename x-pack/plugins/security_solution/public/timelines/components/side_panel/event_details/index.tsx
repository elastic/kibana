/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash/fp';
import _ from 'lodash';
import {
  EuiButtonEmpty,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { FormattedMessage } from 'react-intl';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { ExpandableEvent, ExpandableEventTitle } from './expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { HostIsolationPanel } from '../../../../detections/components/host_isolation';

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

  const [hostIsolationPanelOpen, setHostIsolationPanel] = useState(false);

  const showAlertDetails = useCallback(() => {
    setHostIsolationPanel(false);
  }, []);

  const isAlert = some({ category: 'signal', field: 'signal.rule.id' }, detailsData);

  const isEndpointAlert =
    _.find(detailsData, { category: 'agent', field: 'agent.type' })?.values[0] === 'endpoint';

  if (!expandedEvent?.eventId) {
    return null;
  }

  return isFlyoutView ? (
    <>
      <EuiFlyoutHeader hasBorder>
        {hostIsolationPanelOpen ? (
          <>
            <EuiButtonEmpty
              iconType="arrowLeft"
              iconSide="left"
              flush="left"
              onClick={() => showAlertDetails()}
            >
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.securitySolution.hostIsolation.backToAlertDetails"
                    defaultMessage="Alert details"
                  />
                </p>
              </EuiText>
            </EuiButtonEmpty>
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostIsolation.isolateHost"
                  defaultMessage="Isolate host"
                />
              </h2>
            </EuiTitle>
          </>
        ) : (
          <ExpandableEventTitle isAlert={isAlert} loading={loading} />
        )}
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        {hostIsolationPanelOpen ? (
          <HostIsolationPanel details={detailsData} cancelCallback={showAlertDetails} />
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
      {isEndpointAlert && hostIsolationPanelOpen === false && (
        <EuiFlyoutFooter>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconSide="right"
                fill
                iconType="arrowDown"
                onClick={() => {
                  setHostIsolationPanel(true);
                }}
              >
                <FormattedMessage
                  id="xpack.securitySolution.eventDetails.actionsMenu"
                  defaultMessage="Take action"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
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
