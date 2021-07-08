/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, isEmpty } from 'lodash/fp';
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
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { TimelineTabs } from '../../../../../common/types/timeline';
import { BrowserFields } from '../../../../common/containers/source';
import { EventDetails } from '../../../../common/components/event_details/event_details';
import { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import { LineClamp } from '../../../../common/components/line_clamp';
import * as i18n from './translations';
import { LinkAnchor } from '../../../../common/components/links';
import { APP_ID, SecurityPageName } from '../../../../../common/constants';
import { getRuleDetailsUrl, useFormatUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';

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
        <EuiTitle size="s">
          {!loading ? (
            <h4>{isAlert && !isEmpty(ruleName) ? ruleName : i18n.EVENT_DETAILS}</h4>
          ) : (
            <></>
          )}
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
    const { navigateToApp } = useKibana().services.application;
    const { formatUrl } = useFormatUrl(SecurityPageName.rules);

    const reason = useMemo(() => {
      if (detailsData) {
        const reasonField = find({ category: 'event', field: 'reason' }, detailsData) as
          | TimelineEventsDetailsItem
          | undefined;

        if (reasonField?.originalValue) {
          return Array.isArray(reasonField?.originalValue)
            ? reasonField?.originalValue.join()
            : reasonField?.originalValue;
        }
      }
      return null;
    }, [detailsData]);

    const ruleId = useMemo(() => {
      const findRuleId = find({ category: 'signal', field: 'signal.rule.id' }, detailsData)?.values;
      return findRuleId ? findRuleId[0] : '';
    }, [detailsData]);

    if (!event.eventId) {
      return <EuiTextColor color="subdued">{i18n.EVENT_DETAILS_PLACEHOLDER}</EuiTextColor>;
    }

    if (loading) {
      return <EuiLoadingContent lines={10} />;
    }

    return (
      <StyledFlexGroup direction="column" gutterSize="none">
        {reason && (
          <EuiFlexItem grow={false}>
            <EuiDescriptionList data-test-subj="event-reason" compressed>
              <EuiDescriptionListTitle>{i18n.REASON}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <LineClamp>{reason}</LineClamp>
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
            <EuiSpacer size="m" />
            <LinkAnchor
              data-test-subj="ruleName"
              onClick={(ev: { preventDefault: () => void }) => {
                ev.preventDefault();
                navigateToApp(APP_ID, {
                  deepLinkId: SecurityPageName.rules,
                  path: getRuleDetailsUrl(ruleId),
                });
              }}
              href={formatUrl(getRuleDetailsUrl(ruleId))}
            >
              {i18n.VIEW_RULE_DETAILS_PAGE}
            </LinkAnchor>
            <EuiHorizontalRule />
          </EuiFlexItem>
        )}

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
