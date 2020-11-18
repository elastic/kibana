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

import { TimelineExpandedEventType } from '../../../../common/types/timeline';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { timelineActions } from '../../../timelines/store/timeline';
import { BrowserFields, DocValueFields } from '../../containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../hooks/use_selector';

const StyledEuiFlyout = styled(EuiFlyout)`
  z-index: 9999;
`;

interface EventDetailsFlyoutProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

const EventDetailsFlyoutComponent: React.FC<EventDetailsFlyoutProps> = ({
  browserFields,
  docValueFields,
  timelineId,
  toggleColumn,
}) => {
  const dispatch = useDispatch();
  const expandedEvent = useDeepEqualSelector(
    (state) => state.timeline.timelineById[timelineId]?.expandedEvent ?? {}
  );

  const handleClearSelection = useCallback(() => {
    if (expandedEvent.eventId) {
      dispatch(
        timelineActions.toggleExpandedEvent({
          timelineId,
          ...(expandedEvent as TimelineExpandedEventType),
        })
      );
    }
  }, [dispatch, expandedEvent, timelineId]);

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
          toggleColumn={toggleColumn}
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
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.toggleColumn === nextProps.toggleColumn
);
