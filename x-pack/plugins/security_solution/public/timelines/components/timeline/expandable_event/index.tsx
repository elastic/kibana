/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash/fp';
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
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

import { TimelineExpandedEventType, TimelineTabs } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import {
  EventDetails,
  EventsViewType,
  View,
} from '../../../../common/components/event_details/event_details';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { LineClamp } from '../../../../common/components/line_clamp';
import * as i18n from './translations';

export type HandleOnEventClosed = () => void;
interface Props {
  browserFields: BrowserFields;
  detailsData: TimelineEventsDetailsItem[] | null;
  event: TimelineExpandedEventType;
  isAlert: boolean;
  loading: boolean;
  messageHeight?: number;
  timelineTabType: TimelineTabs | 'flyout';
  timelineId: string;
}

interface ExpandableEventTitleProps {
  isAlert: boolean;
  loading: boolean;
  handleOnEventClosed?: HandleOnEventClosed;
}

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  flex: 0;
`;

const StyledFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

const StyledEuiFlexItem = styled(EuiFlexItem)`
  &.euiFlexItem {
    flex: 1 0 0;
    overflow: hidden;
  }
`;

export const ExpandableEventTitle = React.memo<ExpandableEventTitleProps>(
  ({ isAlert, loading, handleOnEventClosed }) => (
    <StyledEuiFlexGroup justifyContent="spaceBetween" wrap={true}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          {!loading ? <h4>{isAlert ? i18n.ALERT_DETAILS : i18n.EVENT_DETAILS}</h4> : <></>}
        </EuiTitle>
      </EuiFlexItem>
      {handleOnEventClosed && (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="cross" aria-label={i18n.CLOSE} onClick={handleOnEventClosed} />
        </EuiFlexItem>
      )}
    </StyledEuiFlexGroup>
  )
);

ExpandableEventTitle.displayName = 'ExpandableEventTitle';

export const ExpandableEvent = React.memo<Props>(
  ({ browserFields, event, timelineId, timelineTabType, isAlert, loading, detailsData }) => {
    const [view, setView] = useState<View>(EventsViewType.summaryView);

    const message = useMemo(() => {
      if (detailsData) {
        const messageField = find({ category: 'base', field: 'message' }, detailsData) as
          | TimelineEventsDetailsItem
          | undefined;

        if (messageField?.originalValue) {
          return Array.isArray(messageField?.originalValue)
            ? messageField?.originalValue.join()
            : messageField?.originalValue;
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
      <StyledFlexGroup direction="column" gutterSize="none">
        {message && (
          <EuiFlexItem grow={false}>
            <EuiDescriptionList data-test-subj="event-message" compressed>
              <EuiDescriptionListTitle>{i18n.MESSAGE}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <LineClamp content={message} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
            <EuiSpacer size="m" />
          </EuiFlexItem>
        )}
        <StyledEuiFlexItem grow={true}>
          <EventDetails
            browserFields={browserFields}
            data={detailsData!}
            id={event.eventId!}
            isAlert={isAlert}
            onViewSelected={setView}
            timelineTabType={timelineTabType}
            timelineId={timelineId}
            view={view}
          />
        </StyledEuiFlexItem>
      </StyledFlexGroup>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
