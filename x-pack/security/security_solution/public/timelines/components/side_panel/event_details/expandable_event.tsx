/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewChatByTitle } from '@kbn/elastic-assistant';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { isEmpty } from 'lodash/fp';
import {
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiTextColor,
  EuiSkeletonText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCopy,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { ALERT_WORKFLOW_ASSIGNEE_IDS } from '@kbn/rule-data-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';
import { Assignees } from '../../../../flyout/document_details/right/components/assignees';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import type { TimelineTabs } from '../../../../../common/types/timeline';
import type { BrowserFields } from '../../../../common/containers/source';
import { EventDetails } from '../../../../common/components/event_details/event_details';
import type { TimelineEventsDetailsItem } from '../../../../../common/search_strategy/timeline';
import * as i18n from './translations';
import {
  ALERT_SUMMARY_CONVERSATION_ID,
  EVENT_SUMMARY_CONVERSATION_ID,
} from '../../../../common/components/event_details/translations';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { useGetAlertDetailsFlyoutLink } from './use_get_alert_details_flyout_link';
import { useRefetchByScope } from './flyout/use_refetch_by_scope';

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
  eventIndex: string;
  isAlert: boolean;
  loading: boolean;
  promptContextId?: string;
  ruleName?: string;
  timestamp: string;
  handleOnEventClosed?: HandleOnEventClosed;
  scopeId: string;
  refetchFlyoutData: () => Promise<void>;
  getFieldsData: GetFieldsData;
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
  ({
    eventId,
    eventIndex,
    isAlert,
    loading,
    handleOnEventClosed,
    promptContextId,
    ruleName,
    timestamp,
    scopeId,
    refetchFlyoutData,
    getFieldsData,
  }) => {
    const { hasAssistantPrivilege } = useAssistantAvailability();
    const alertDetailsLink = useGetAlertDetailsFlyoutLink({
      _id: eventId,
      _index: eventIndex,
      timestamp,
    });
    const urlModifier = (value: string) => {
      return `${value}&${URL_PARAM_KEY.eventFlyout}=(preview:!(),rightPanel:(id:document-details-right,params:(id:${eventId},indexName:${eventIndex},scopeId:${scopeId})))`;
    };

    const { refetch } = useRefetchByScope({ scopeId });
    const alertAssignees = useMemo(
      () => (getFieldsData(ALERT_WORKFLOW_ASSIGNEE_IDS) as string[]) ?? [],
      [getFieldsData]
    );
    const onAssigneesUpdated = useCallback(() => {
      refetch();
      refetchFlyoutData();
    }, [refetch, refetchFlyoutData]);

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
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" alignItems="flexEnd" gutterSize="none">
            {handleOnEventClosed && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  aria-label={i18n.CLOSE}
                  onClick={handleOnEventClosed}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" direction="row" gutterSize="none">
                {hasAssistantPrivilege && promptContextId != null && (
                  <EuiFlexItem grow={false}>
                    <NewChatByTitle
                      conversationTitle={
                        isAlert ? ALERT_SUMMARY_CONVERSATION_ID : EVENT_SUMMARY_CONVERSATION_ID
                      }
                      promptContextId={promptContextId}
                    />
                  </EuiFlexItem>
                )}
                {isAlert && alertDetailsLink && (
                  <EuiFlexItem grow={false}>
                    <EuiCopy textToCopy={urlModifier(alertDetailsLink)}>
                      {(copy) => (
                        <EuiButtonEmpty
                          onClick={copy}
                          iconType="share"
                          data-test-subj="copy-alert-flyout-link"
                        >
                          {i18n.SHARE_ALERT}
                        </EuiButtonEmpty>
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            {isAlert && scopeId !== TableId.rulePreview && (
              <EuiFlexItem grow={false}>
                <Assignees
                  eventId={eventId}
                  assignedUserIds={alertAssignees}
                  onAssigneesUpdated={onAssigneesUpdated}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
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
      return <EuiSkeletonText lines={10} />;
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
