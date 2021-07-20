/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import {
  EuiButtonIcon,
  EuiTextColor,
  EuiLoadingContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { TimelineTabs } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { EventDetails } from '../../../../common/components/event_details/event_details';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import * as i18n from './translations';

export type HandleOnEventClosed = () => void;
interface Props {
  browserFields: BrowserFields;
  detailsData: TimelineEventsDetailsItem[] | null;
  event: { eventId: string; indexName: string };
  isAlert: boolean;
  loading: boolean;
  messageHeight?: number;
  timelineTabType: TimelineTabs | 'flyout';
  timelineId: string;
}

interface ExpandableEventTitleProps {
  isAlert: boolean;
  loading: boolean;
  ruleName?: string;
  handleOnEventClosed?: HandleOnEventClosed;
}

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  flex: 0 1 auto;
  ${({ theme }) => `margin-top: ${theme.eui.euiSizeS};`}
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
  ({ isAlert, loading, handleOnEventClosed, ruleName }) => (
    <StyledEuiFlexGroup gutterSize="none" justifyContent="spaceBetween" wrap={true}>
      <EuiFlexItem grow={false}>
        {!loading && (
          <EuiTitle size="s">
            <h4>{isAlert && !isEmpty(ruleName) ? ruleName : i18n.EVENT_DETAILS}</h4>
          </EuiTitle>
        )}
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
    if (!event.eventId) {
      return <EuiTextColor color="subdued">{i18n.EVENT_DETAILS_PLACEHOLDER}</EuiTextColor>;
    }

    if (loading) {
      return <EuiLoadingContent lines={10} />;
    }

    return (
      <StyledFlexGroup direction="column" gutterSize="none">
        <StyledEuiFlexItem grow={true}>
          <EventDetails
            browserFields={browserFields}
            data={detailsData ?? []}
            id={event.eventId!}
            isAlert={isAlert}
            timelineId={timelineId}
            timelineTabType={timelineTabType}
          />
        </StyledEuiFlexItem>
      </StyledFlexGroup>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
