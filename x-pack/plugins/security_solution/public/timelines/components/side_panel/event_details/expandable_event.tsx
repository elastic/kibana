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

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { getAlertDetailsUrl } from '../../../../common/components/link_to';
import {
  SecuritySolutionLinkAnchor,
  useGetSecuritySolutionLinkProps,
} from '../../../../common/components/links';
import type { TimelineTabs } from '../../../../../common/types/timeline';
import type { BrowserFields } from '../../../../common/containers/source';
import { EventDetails } from '../../../../common/components/event_details/event_details';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import * as i18n from './translations';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { SecurityPageName } from '../../../../../common/constants';

export type HandleOnEventClosed = () => void;
interface Props {
  browserFields: BrowserFields;
  detailsData: TimelineEventsDetailsItem[] | null;
  detailsEcsData: Ecs | null;
  event: { eventId: string; indexName: string };
  isAlert: boolean;
  isDraggable?: boolean;
  loading: boolean;
  messageHeight?: number;
  rawEventData: object | undefined;
  timelineTabType: TimelineTabs | 'flyout';
  scopeId: string;
  handleOnEventClosed: HandleOnEventClosed;
  isReadOnly?: boolean;
}

interface ExpandableEventTitleProps {
  eventId: string;
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
  ({ eventId, isAlert, loading, handleOnEventClosed, ruleName, timestamp }) => {
    const isAlertDetailsPageEnabled = useIsExperimentalFeatureEnabled('alertDetailsPageEnabled');
    const { onClick } = useGetSecuritySolutionLinkProps()({
      deepLinkId: SecurityPageName.alerts,
      path: eventId && isAlert ? getAlertDetailsUrl(eventId) : '',
    });
    return (
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
              {isAlert && eventId && isAlertDetailsPageEnabled && (
                <>
                  <EuiSpacer size="l" />
                  <SecuritySolutionLinkAnchor
                    data-test-subj="open-alert-details-page"
                    deepLinkId={SecurityPageName.alerts}
                    onClick={onClick}
                  >
                    {i18n.OPEN_ALERT_DETAILS_PAGE}
                  </SecuritySolutionLinkAnchor>
                  <EuiSpacer size="m" />
                </>
              )}
            </>
          )}
        </EuiFlexItem>
        {handleOnEventClosed && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="cross" aria-label={i18n.CLOSE} onClick={handleOnEventClosed} />
          </EuiFlexItem>
        )}
      </StyledEuiFlexGroup>
    );
  }
);

ExpandableEventTitle.displayName = 'ExpandableEventTitle';

export const ExpandableEvent = React.memo<Props>(
  ({
    browserFields,
    event,
    scopeId,
    timelineTabType,
    isAlert,
    isDraggable,
    loading,
    detailsData,
    detailsEcsData,
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
            detailsEcsData={detailsEcsData}
            id={event.eventId}
            isAlert={isAlert}
            indexName={event.indexName}
            isDraggable={isDraggable}
            rawEventData={rawEventData}
            scopeId={scopeId}
            timelineTabType={timelineTabType}
            handleOnEventClosed={handleOnEventClosed}
            isReadOnly={isReadOnly}
          />
        </StyledEuiFlexItem>
      </StyledFlexGroup>
    );
  }
);

ExpandableEvent.displayName = 'ExpandableEvent';
