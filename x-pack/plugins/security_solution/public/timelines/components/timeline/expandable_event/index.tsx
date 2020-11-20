/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiTextColor,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingContent,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { get } from 'lodash/fp';
import { TimelineExpandedEvent } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../../timelines/store/timeline/model';
import { LazyAccordion } from '../../lazy_accordion';
import { useTimelineEventsDetails } from '../../../containers/details';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { getColumnHeaders } from '../body/column_headers/helpers';
import { timelineDefaults } from '../../../store/timeline/defaults';
import * as i18n from './translations';
import { EventDetails } from '../../../../common/components/event_details/event_details';

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
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

export const ExpandableEventTitle = React.memo(({ isAlert }: { isAlert: boolean }) => (
  <EuiTitle size="s">
    <h4>{isAlert ? i18n.ALERT_DETAILS : i18n.EVENT_DETAILS}</h4>
  </EuiTitle>
));

ExpandableEventTitle.displayName = 'ExpandableEventTitle';

export const ExpandableEvent = React.memo<Props>(
  ({ browserFields, docValueFields, event, timelineId, toggleColumn }) => {
    const dispatch = useDispatch();
    const getTimeline = timelineSelectors.getTimelineByIdSelector();

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

    const eventKindData = useMemo(
      () => (detailsData || []).find((item) => item.field === 'event.kind'),
      [detailsData]
    );
    const eventKind = get('values.0', eventKindData);

    const onUpdateColumns = useCallback(
      (columns) => dispatch(timelineActions.updateColumns({ id: timelineId, columns })),
      [dispatch, timelineId]
    );

    const handleRenderExpandedContent = useCallback(
      () => (
        <EventDetails
          browserFields={browserFields}
          columnHeaders={columnHeaders}
          data={detailsData!}
          id={event.eventId!}
          onUpdateColumns={onUpdateColumns}
          timelineId={timelineId}
          toggleColumn={toggleColumn}
        />
      ),
      [
        browserFields,
        columnHeaders,
        detailsData,
        event.eventId,
        onUpdateColumns,
        timelineId,
        toggleColumn,
      ]
    );

    if (!event.eventId) {
      return <EuiTextColor color="subdued">{i18n.EVENT_DETAILS_PLACEHOLDER}</EuiTextColor>;
    }

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          {loading && <EuiSpacer />}
          {!loading && <ExpandableEventTitle isAlert={eventKind !== 'event'} />}
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {loading && <EuiLoadingContent lines={10} />}
          {!loading && (
            <ExpandableDetails>
              <LazyAccordion
                id={`timeline-${timelineId}-row-${event.eventId}`}
                renderExpandedContent={handleRenderExpandedContent}
                forceExpand={!!event.eventId && !loading}
                paddingSize="none"
              />
            </ExpandableDetails>
          )}
        </EuiFlyoutBody>
      </>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
