/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiLoadingContent,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import { ThreatSummaryView } from './cti_details/threat_summary_view';
import { ThreatDetailsView } from './cti_details/threat_details_view';
import * as i18n from './translations';
import { AlertSummaryView } from './alert_summary_view';
import { BrowserFields } from '../../containers/source';
import { useInvestigationTimeEnrichment } from '../../containers/cti/event_enrichment';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import { TimelineTabs } from '../../../../common/types/timeline';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  timelineDataToEnrichment,
} from './cti_details/helpers';
import { NoEnrichmentsPanel } from './cti_details/no_enrichments_panel';

type EventViewTab = EuiTabbedContentTab;

export type EventViewId =
  | EventsViewType.tableView
  | EventsViewType.jsonView
  | EventsViewType.summaryView
  | EventsViewType.threatIntelView;
export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
  summaryView = 'summary-view',
  threatIntelView = 'threat-intel-view',
}

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  id: string;
  isAlert: boolean;
  timelineTabType: TimelineTabs | 'flyout';
  timelineId: string;
}

const StyledEuiTabbedContent = styled(EuiTabbedContent)`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;

  > [role='tabpanel'] {
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    overflow-y: auto;
    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: 7px;
    }
    ::-webkit-scrollbar-thumb {
      border-radius: 4px;
      background-color: rgba(0, 0, 0, 0.5);
      -webkit-box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
    }
  }
`;

const TabContentWrapper = styled.div`
  height: 100%;
  position: relative;
`;

const EventDetailsComponent: React.FC<Props> = ({
  browserFields,
  data,
  id,
  isAlert,
  timelineId,
  timelineTabType,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<EventViewId>(EventsViewType.summaryView);
  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => setSelectedTabId(tab.id as EventViewId),
    [setSelectedTabId]
  );

  const eventFields = useMemo(() => getEnrichmentFields(data), [data]);
  const existingEnrichments = useMemo(
    () =>
      isAlert
        ? parseExistingEnrichments(data).map((enrichmentData) =>
            timelineDataToEnrichment(enrichmentData)
          )
        : [],
    [data, isAlert]
  );
  const {
    loading: enrichmentsLoading,
    result: enrichmentsResponse,
  } = useInvestigationTimeEnrichment(eventFields);

  const allEnrichments = useMemo(() => {
    if (enrichmentsLoading || !enrichmentsResponse?.enrichments) {
      return existingEnrichments;
    }
    return filterDuplicateEnrichments([...existingEnrichments, ...enrichmentsResponse.enrichments]);
  }, [enrichmentsLoading, enrichmentsResponse, existingEnrichments]);

  const enrichmentCount = allEnrichments.length;

  const summaryTab: EventViewTab | undefined = useMemo(
    () =>
      isAlert
        ? {
            id: EventsViewType.summaryView,
            name: i18n.OVERVIEW,
            content: (
              <>
                <AlertSummaryView
                  {...{
                    data,
                    eventId: id,
                    browserFields,
                    timelineId,
                    title: i18n.DUCOMENT_SUMMARY,
                  }}
                />
                {enrichmentCount > 0 && (
                  <ThreatSummaryView
                    browserFields={browserFields}
                    data={data}
                    eventId={id}
                    timelineId={timelineId}
                    enrichments={allEnrichments}
                  />
                )}
                {enrichmentsLoading && (
                  <>
                    <EuiLoadingContent lines={2} />
                  </>
                )}
              </>
            ),
          }
        : undefined,
    [
      isAlert,
      data,
      id,
      browserFields,
      timelineId,
      enrichmentsLoading,
      enrichmentCount,
      allEnrichments,
    ]
  );

  const threatIntelTab = useMemo(
    () =>
      isAlert
        ? {
            id: EventsViewType.threatIntelView,
            'data-test-subj': 'threatIntelTab',
            name: (
              <EuiFlexGroup
                direction="row"
                alignItems={'center'}
                justifyContent={'spaceAround'}
                gutterSize="xs"
              >
                <EuiFlexItem>
                  <span>{i18n.THREAT_INTEL}</span>
                </EuiFlexItem>
                <EuiFlexItem>
                  {enrichmentsLoading ? (
                    <EuiLoadingSpinner />
                  ) : (
                    <EuiNotificationBadge data-test-subj="enrichment-count-notification">
                      {enrichmentCount}
                    </EuiNotificationBadge>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            content: (
              <>
                <ThreatDetailsView enrichments={allEnrichments} />
                <NoEnrichmentsPanel
                  isInvestigationTimeEnrichmentsPresent={
                    enrichmentCount > existingEnrichments.length
                  }
                  isIndicatorMatchesPresent={existingEnrichments.length > 0}
                />
              </>
            ),
          }
        : undefined,
    [allEnrichments, enrichmentCount, enrichmentsLoading, existingEnrichments.length, isAlert]
  );

  const tableTab = useMemo(
    () => ({
      id: EventsViewType.tableView,
      'data-test-subj': 'tableTab',
      name: i18n.TABLE,
      content: (
        <>
          <EuiSpacer size="l" />
          <EventFieldsBrowser
            browserFields={browserFields}
            data={data}
            eventId={id}
            timelineId={timelineId}
            timelineTabType={timelineTabType}
          />
        </>
      ),
    }),
    [browserFields, data, id, timelineId, timelineTabType]
  );

  const jsonTab = useMemo(
    () => ({
      id: EventsViewType.jsonView,
      'data-test-subj': 'jsonViewTab',
      name: i18n.JSON_VIEW,
      content: (
        <>
          <EuiSpacer size="m" />
          <TabContentWrapper data-test-subj="jsonViewWrapper">
            <JsonView data={data} />
          </TabContentWrapper>
        </>
      ),
    }),
    [data]
  );

  const tabs = useMemo(() => {
    return [summaryTab, threatIntelTab, tableTab, jsonTab].filter(
      (tab: EventViewTab | undefined): tab is EventViewTab => !!tab
    );
  }, [summaryTab, threatIntelTab, tableTab, jsonTab]);

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0], [
    tabs,
    selectedTabId,
  ]);

  return (
    <StyledEuiTabbedContent
      data-test-subj="eventDetails"
      tabs={tabs}
      selectedTab={selectedTab}
      onTabClick={handleTabClick}
      key="event-summary-tabs"
    />
  );
};

EventDetailsComponent.displayName = 'EventDetailsComponent';

export const EventDetails = React.memo(EventDetailsComponent);
