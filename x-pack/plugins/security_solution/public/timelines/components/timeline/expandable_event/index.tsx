/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTextColor, EuiLoadingContent, EuiTitle } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { TimelineExpandedEvent } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { StatefulEventDetails } from '../../../../common/components/event_details/stateful_event_details';
import { LazyAccordion } from '../../lazy_accordion';
import { useTimelineEventsDetails } from '../../../containers/details';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { getColumnHeaders } from '../body/column_headers/helpers';
import { timelineDefaults } from '../../../store/timeline/defaults';
import * as i18n from './translations';

const ExpandableDetails = styled.div`
  .euiAccordion__button {
    display: none;
  }
`;

ExpandableDetails.displayName = 'ExpandableDetails';

interface Props {
  browserFields: BrowserFields;
  docValueFields: DocValueFields[];
  event: TimelineExpandedEvent;
  timelineId: string;
}

export const ExpandableEventTitle = React.memo(() => (
  <EuiTitle size="s">
    <h4>{i18n.EVENT_DETAILS}</h4>
  </EuiTitle>
));

ExpandableEventTitle.displayName = 'ExpandableEventTitle';

export const ExpandableEvent = React.memo<Props>(
  ({ browserFields, docValueFields, event, timelineId }) => {
    const dispatch = useDispatch();
    const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);

    const columnHeaders = useDeepEqualSelector((state) => {
      const { columns } = getTimeline(state, timelineId) ?? timelineDefaults;

      return getColumnHeaders(columns, browserFields);
    });

    const [loading, detailsData] = useTimelineEventsDetails({
      docValueFields,
      indexName: event.indexName!,
      eventId: event.eventId!,
      skip: !event.eventId,
    });

    const onUpdateColumns = useCallback(
      (columns) => dispatch(timelineActions.updateColumns({ id: timelineId, columns })),
      [dispatch, timelineId]
    );

    const handleRenderExpandedContent = useCallback(
      () => (
        <StatefulEventDetails
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          data={detailsData!}
          id={event.eventId!}
          onUpdateColumns={onUpdateColumns}
          timelineId={timelineId}
        />
      ),
      [browserFields, columnHeaders, detailsData, event.eventId, onUpdateColumns, timelineId]
    );

    if (!event.eventId) {
      return <EuiTextColor color="subdued">{i18n.EVENT_DETAILS_PLACEHOLDER}</EuiTextColor>;
    }

    if (loading) {
      return <EuiLoadingContent lines={10} />;
    }

    return (
      <ExpandableDetails>
        <LazyAccordion
          id={`timeline-${timelineId}-row-${event.eventId}`}
          renderExpandedContent={handleRenderExpandedContent}
          forceExpand={!!event.eventId && !loading}
          paddingSize="none"
        />
      </ExpandableDetails>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
