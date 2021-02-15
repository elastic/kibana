/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { some } from 'lodash/fp';
import { EuiFlyoutHeader, EuiFlyoutBody, EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { ExpandableEvent, ExpandableEventTitle } from './expandable_event';
import { useTimelineEventsDetails } from '../../../containers/details';
import { TimelineTabs } from '../../../../../common/types/timeline';

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflow {
    display: flex;
    flex: 1;
    overflow: hidden;

    .euiFlyoutBody__overflowContent {
      flex: 1;
      overflow: hidden;
      padding: ${({ theme }) => `${theme.eui.paddingSizes.xs} ${theme.eui.paddingSizes.m} 64px`};
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

  const isAlert = some({ category: 'signal', field: 'signal.rule.id' }, detailsData);

  if (!expandedEvent?.eventId) {
    return null;
  }

  return isFlyoutView ? (
    <>
      <EuiFlyoutHeader hasBorder>
        <ExpandableEventTitle isAlert={isAlert} loading={loading} />
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <ExpandableEvent
          browserFields={browserFields}
          detailsData={detailsData}
          event={expandedEvent}
          isAlert={isAlert}
          loading={loading}
          timelineId={timelineId}
          timelineTabType="flyout"
        />
      </StyledEuiFlyoutBody>
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
    prevProps.timelineId === nextProps.timelineId
);
