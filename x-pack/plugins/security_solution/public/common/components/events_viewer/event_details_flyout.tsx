/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';
import { useDispatch } from 'react-redux';

import { timelineActions } from '../../../timelines/store/timeline';
import { BrowserFields, DocValueFields } from '../../containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../hooks/use_selector';

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
        <ExpandableEventTitle />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ExpandableEvent
          browserFields={browserFields}
          docValueFields={docValueFields}
          event={expandedEvent}
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
