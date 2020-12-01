/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash/fp';
import { EuiTextColor, EuiLoadingContent, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React, { useMemo, useState } from 'react';

import { TimelineExpandedEvent } from '../../../../../common/types/timeline';
import { BrowserFields, DocValueFields } from '../../../../common/containers/source';
import {
  EventDetails,
  EventsViewType,
  View,
} from '../../../../common/components/event_details/event_details';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { useTimelineEventsDetails } from '../../../containers/details';
import * as i18n from './translations';

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
    const [view, setView] = useState<View>(EventsViewType.tableView);

    const [loading, detailsData] = useTimelineEventsDetails({
      docValueFields,
      indexName: event.indexName!,
      eventId: event.eventId!,
      skip: !event.eventId,
    });

    const message = useMemo(() => {
      if (detailsData) {
        const messageField = find({ category: 'base', field: 'message' }, detailsData) as
          | TimelineEventsDetailsItem
          | undefined;

        if (messageField?.originalValue) {
          return messageField?.originalValue;
        }
      }
      return null;
    }, [detailsData]);

    if (!event.eventId) {
      return <EuiTextColor color="subdued">{i18n.EVENT_DETAILS_PLACEHOLDER}</EuiTextColor>;
    }

    if (loading) {
      return <EuiLoadingContent lines={10} />;
    }

    return (
      <>
        <EuiText>{message}</EuiText>
        <EuiSpacer size="m" />
        <EventDetails
          browserFields={browserFields}
          data={detailsData!}
          id={event.eventId!}
          onViewSelected={setView}
          timelineId={timelineId}
          view={view}
        />
      </>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
