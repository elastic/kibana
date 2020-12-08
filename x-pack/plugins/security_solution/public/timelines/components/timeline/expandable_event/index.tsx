/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiTextColor,
  EuiLoadingContent,
  EuiTitle,
  EuiSpacer,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { find } from 'lodash/fp';

import { TimelineExpandedEvent } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import {
  EventDetails,
  EventsViewType,
  View,
} from '../../../../common/components/event_details/event_details';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import * as i18n from './translations';
import { LineClamp } from '../../../../common/components/line_clamp';

export type OnEventDetailsClose = () => void;
interface Props {
  browserFields: BrowserFields;
  detailsData: TimelineEventsDetailsItem[] | null;
  event: TimelineExpandedEvent;
  isAlert: boolean;
  loading: boolean;
  timelineId: string;
}

export const ExpandableEventTitle = React.memo(
  ({
    isAlert,
    loading,
    timelineId,
    onEventDetailsClose,
  }: {
    isAlert: boolean;
    loading: boolean;
    timelineId: string;
    onEventDetailsClose?: OnEventDetailsClose;
  }) => {
    return (
      <div>
        <EuiFlexGroup justifyContent="spaceBetween" wrap={true}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              {!loading ? <h4>{isAlert ? i18n.ALERT_DETAILS : i18n.EVENT_DETAILS}</h4> : <></>}
            </EuiTitle>
          </EuiFlexItem>
          {onEventDetailsClose && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                aria-label={i18n.CLOSE}
                onClick={onEventDetailsClose}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    );
  }
);

ExpandableEventTitle.displayName = 'ExpandableEventTitle';

export const ExpandableEvent = React.memo<Props>(
  ({ browserFields, event, timelineId, isAlert, loading, detailsData }) => {
    const [view, setView] = useState<View>(EventsViewType.summaryView);

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
        {message && (
          <EuiDescriptionList data-test-subj="event-message" compressed>
            <EuiDescriptionListTitle>{i18n.MESSAGE}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <LineClamp content={message} />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        )}
        <EuiSpacer size="m" />
        <EventDetails
          browserFields={browserFields}
          data={detailsData!}
          id={event.eventId!}
          isAlert={isAlert}
          onViewSelected={setView}
          timelineId={timelineId}
          view={view}
        />
      </>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
