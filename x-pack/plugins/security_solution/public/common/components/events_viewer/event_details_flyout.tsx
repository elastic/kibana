/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import React, { useMemo, useCallback } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { useDispatch } from 'react-redux';
import { findIndex } from 'lodash/fp';

import { timelineActions } from '../../../timelines/store/timeline';
import { BrowserFields, DocValueFields } from '../../containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';

const StyledEuiFlyout = styled(EuiFlyout)`
  z-index: ${({ theme }) => theme.eui.euiZLevel7};
`;

interface EventDetailsFlyoutProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  timelineId: string;
}

const emptyExpandedEvent = {};

const EventDetailsFlyoutComponent: React.FC<EventDetailsFlyoutProps> = ({
  browserFields,
  docValueFields,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const expandedEvent = useDeepEqualSelector(
    (state) => state.timeline.timelineById[timelineId]?.expandedEvent ?? emptyExpandedEvent
  );

  const [loading, detailsData] = useTimelineEventsDetails({
    docValueFields,
    indexName: expandedEvent.indexName!,
    eventId: expandedEvent.eventId!,
    skip: !expandedEvent.eventId,
  });

  const isAlert = useMemo(() => {
    if (detailsData) {
      return findIndex({ category: 'signal', field: 'signal.rule.id' }, detailsData) >= 0;
    }
    return false;
  }, [detailsData]);

  const handleClearSelection = useCallback(() => {
    dispatch(
      timelineActions.toggleExpandedEvent({
        timelineId,
        event: emptyExpandedEvent,
      })
    );
  }, [dispatch, timelineId]);

  if (!expandedEvent.eventId) {
    return null;
  }

  return (
    <StyledEuiFlyout size="s" onClose={handleClearSelection}>
      <EuiFlyoutHeader hasBorder>
        <ExpandableEventTitle isAlert={isAlert} loading={loading} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ExpandableEvent
          browserFields={browserFields}
          detailsData={detailsData}
          event={expandedEvent}
          isAlert={isAlert}
          loading={loading}
          timelineId={timelineId}
        />
      </EuiFlyoutBody>
    </StyledEuiFlyout>
  );
};

export const EventDetailsFlyout = React.memo(
  EventDetailsFlyoutComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.docValueFields, nextProps.docValueFields) &&
    prevProps.timelineId === nextProps.timelineId
);
