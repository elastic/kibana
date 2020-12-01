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
import React from 'react';
import deepEqual from 'fast-deep-equal';

import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { BrowserFields, DocValueFields } from '../../../common/containers/source';
import {
  ExpandableEvent,
  ExpandableEventTitle,
} from '../../../timelines/components/timeline/expandable_event';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

interface EventDetailsProps {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

const EventDetailsComponent: React.FC<EventDetailsProps> = ({
  browserFields,
  docValueFields,
  timelineId,
  toggleColumn,
}) => {
  const expandedEvent = useDeepEqualSelector(
    (state) => state.timeline.timelineById[timelineId]?.expandedEvent ?? {}
  );

  return (
    <>
      <ExpandableEventTitle />
      <EuiSpacer />
      <ExpandableEvent
        browserFields={browserFields}
        docValueFields={docValueFields}
        event={expandedEvent}
        timelineId={timelineId}
        toggleColumn={toggleColumn}
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
    prevProps.toggleColumn === nextProps.toggleColumn
);
