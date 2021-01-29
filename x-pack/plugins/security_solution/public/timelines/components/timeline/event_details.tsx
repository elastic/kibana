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

import { some } from 'lodash/fp';
import { EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import deepEqual from 'fast-deep-equal';

import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
  HandleOnEventClosed,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useTimelineEventsDetails } from '../../containers/details';
import { timelineSelectors } from '../../store/timeline';
import { timelineDefaults } from '../../store/timeline/defaults';
import { TimelineTabs } from '../../../../common/types/timeline';

interface EventDetailsProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  tabType: TimelineTabs;
  timelineId: string;
  handleOnEventClosed?: HandleOnEventClosed;
}

const EventDetailsComponent: React.FC<EventDetailsProps> = ({
  browserFields,
  docValueFields,
  tabType,
  timelineId,
  handleOnEventClosed,
}) => {
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const expandedEvent = useDeepEqualSelector(
    (state) => (getTimeline(state, timelineId) ?? timelineDefaults).expandedEvent[tabType] ?? {}
  );

  const [loading, detailsData] = useTimelineEventsDetails({
    docValueFields,
    indexName: expandedEvent.indexName!,
    eventId: expandedEvent.eventId!,
    skip: !expandedEvent.eventId,
  });

  const isAlert = useMemo(
    () => some({ category: 'signal', field: 'signal.rule.id' }, detailsData),
    [detailsData]
  );

  return (
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

export const EventDetails = React.memo(
  EventDetailsComponent,
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    deepEqual(prevProps.docValueFields, nextProps.docValueFields) &&
    prevProps.timelineId === nextProps.timelineId &&
    prevProps.handleOnEventClosed === nextProps.handleOnEventClosed
);
