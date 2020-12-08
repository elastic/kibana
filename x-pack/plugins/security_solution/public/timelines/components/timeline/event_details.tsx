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
import React, { useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { find } from 'lodash/fp';

import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { useTimelineEventsDetails } from '../../containers/details';

interface EventDetailsProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  timelineId: string;
}

const EventDetailsComponent: React.FC<EventDetailsProps> = ({
  browserFields,
  docValueFields,
  timelineId,
}) => {
  const expandedEvent = useDeepEqualSelector(
    (state) => state.timeline.timelineById[timelineId]?.expandedEvent
  );

  const [loading, detailsData] = useTimelineEventsDetails({
    docValueFields,
    indexName: expandedEvent.indexName!,
    eventId: expandedEvent.eventId!,
    skip: !expandedEvent.eventId,
  });

  const ruleId = useMemo(() => {
    if (detailsData) {
      const signalField = find({ category: 'signal', field: 'signal.rule.id' }, detailsData) as
        | TimelineEventsDetailsItem
        | undefined;

      if (signalField?.originalValue) {
        return signalField?.originalValue;
      }
    }
    return null;
  }, [detailsData]);

  return (
    <>
      <ExpandableEventTitle isAlert={ruleId != null} loading={loading} />
      <EuiSpacer size="m" />
      <ExpandableEvent
        browserFields={browserFields}
        detailsData={detailsData}
        event={expandedEvent}
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
