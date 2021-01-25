/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { some } from 'lodash/fp';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { useDispatch } from 'react-redux';

import { BrowserFields, DocValueFields } from '../../containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { timelineActions, timelineSelectors } from '../../../timelines/store/timeline';
import { timelineDefaults } from '../../../timelines/store/timeline/defaults';

const StyledEuiFlyout = styled(EuiFlyout)`
  z-index: ${({ theme }) => theme.eui.euiZLevel7};
`;

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

interface EventDetailsFlyoutProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  timelineId: string;
}

const EventDetailsFlyoutComponent: React.FC<EventDetailsFlyoutProps> = ({
  browserFields,
  docValueFields,
  timelineId,
}) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const expandedEvent = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults)?.expandedEvent?.query ?? {}
  );

  const handleClearSelection = useCallback(() => {
    dispatch(timelineActions.toggleExpandedEvent({ timelineId }));
  }, [dispatch, timelineId]);

  const [loading, detailsData] = useTimelineEventsDetails({
    docValueFields,
    indexName: expandedEvent?.indexName ?? '',
    eventId: expandedEvent?.eventId ?? '',
    skip: !expandedEvent.eventId,
  });

  const isAlert = useMemo(
    () => some({ category: 'signal', field: 'signal.rule.id' }, detailsData),
    [detailsData]
  );

  if (!expandedEvent.eventId) {
    return null;
  }

  return (
    <StyledEuiFlyout size="s" onClose={handleClearSelection}>
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
