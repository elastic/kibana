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
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { TimelineTabs } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { EventDetails } from '../../../../common/components/event_details/event_details';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import * as i18n from './translations';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { HostRisk } from '../../../../risk_score/containers';

export type HandleOnEventClosed = () => void;
interface Props {
  browserFields: BrowserFields;
  detailsData: TimelineEventsDetailsItem[] | null;
  event: { eventId: string; indexName: string };
  isAlert: boolean;
  isDraggable?: boolean;
  loading: boolean;
  messageHeight?: number;
  rawEventData: object | undefined;
  timelineTabType: TimelineTabs | 'flyout';
  timelineId: string;
  hostRisk: HostRisk | null;
  handleOnEventClosed: HandleOnEventClosed;
  isReadOnly?: boolean;
}

interface ExpandableEventTitleProps {
  isAlert: boolean;
  loading: boolean;
  ruleName?: string;
  timestamp?: string;
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
  ({ isAlert, loading, handleOnEventClosed, ruleName, timestamp }) => (
    <StyledEuiFlexGroup gutterSize="none" justifyContent="spaceBetween" wrap={true}>
      <EuiFlexItem grow={false}>
        {!loading && (
          <>
            <EuiTitle size="s">
              <h4>{isAlert && !isEmpty(ruleName) ? ruleName : i18n.EVENT_DETAILS}</h4>
            </EuiTitle>
            {timestamp && (
              <>
                <EuiSpacer size="s" />
                <PreferenceFormattedDate value={new Date(timestamp)} />
              </>
            )}
            <EuiSpacer size="m" />
          </>
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
  ({
    browserFields,
    event,
    timelineId,
    timelineTabType,
    isAlert,
    isDraggable,
    loading,
    detailsData,
    hostRisk,
    rawEventData,
    handleOnEventClosed,
    isReadOnly,
  }) => {
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
            id={event.eventId}
            isAlert={isAlert}
            indexName={event.indexName}
            isDraggable={isDraggable}
            rawEventData={rawEventData}
            timelineId={timelineId}
            timelineTabType={timelineTabType}
            hostRisk={hostRisk}
            handleOnEventClosed={handleOnEventClosed}
            isReadOnly={isReadOnly}
          />
        </StyledEuiFlexItem>
      </StyledFlexGroup>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
