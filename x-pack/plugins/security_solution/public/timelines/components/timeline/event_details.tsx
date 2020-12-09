/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { findIndex, pick } from 'lodash/fp';

import { useDispatch } from 'react-redux';
import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
  OnEventDetailsClose,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useTimelineEventsDetails } from '../../containers/details';
import { TimelineId } from '../../../../common/types/timeline';
import { activeTimeline } from '../../containers/active_timeline_context';
import { timelineActions, timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';

interface EventDetailsProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  timelineId: string;
  onEventDetailsClose?: OnEventDetailsClose;
}

const EventDetailsComponent: React.FC<EventDetailsProps> = ({
  browserFields,
  docValueFields,
  timelineId,
  onEventDetailsClose,
}) => {
  const dispatch = useDispatch();
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const { expandedEvent, isSaving } = useDeepEqualSelector((state) =>
    pick(['expandedEvent', 'isSaving'], getTimeline(state, timelineId) ?? timelineDefaults)
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

  const handleOnEventClosed = useCallback(() => {
    dispatch(
      timelineActions.toggleExpandedEvent({
        timelineId,
        event: {},
      })
    );

    if (timelineId === TimelineId.active) {
      activeTimeline.toggleExpandedEvent({
        eventId: expandedEvent.eventId,
        indexName: expandedEvent.indexName,
        loading: false,
      });
    }

    if (onEventDetailsClose) {
      onEventDetailsClose();
    }
  }, [dispatch, timelineId, expandedEvent.indexName, expandedEvent.eventId, onEventDetailsClose]);

  useEffect(() => {
    if (isSaving) {
      handleOnEventClosed();
    }
  }, [isSaving, onEventDetailsClose, handleOnEventClosed]);

  return (
    <>
      <ExpandableEventTitle
        isAlert={isAlert}
        loading={loading}
        onEventDetailsClose={handleOnEventClosed}
      />
      <EuiSpacer size="m" />
      <ExpandableEvent
        browserFields={browserFields}
        detailsData={detailsData}
        event={expandedEvent}
        isAlert={isAlert}
        loading={loading}
        timelineId={timelineId}
      />
    </>
  );
};

export const EventDetails = React.memo(
  EventDetailsComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.docValueFields, nextProps.docValueFields) &&
    prevProps.timelineId === nextProps.timelineId
);
