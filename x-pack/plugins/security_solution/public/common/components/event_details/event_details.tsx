/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiLoadingContent,
  EuiNotificationBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash';

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
import { EnrichmentRangePicker } from './cti_details/enrichment_range_picker';
import { Reason } from './reason';
import { InvestigationGuideView } from './investigation_guide_view';
import { Overview } from './overview';
import { HostRisk } from '../../../risk_score/containers';
import { RelatedCases } from './related_cases';

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
  indexName: string;
  isAlert: boolean;
  isDraggable?: boolean;
  rawEventData: object | undefined;
  timelineTabType: TimelineTabs | 'flyout';
  timelineId: string;
  hostRisk: HostRisk | null;
  handleOnEventClosed: () => void;
  isReadOnly?: boolean;
}

export const Indent = styled.div`
  padding: 0 8px;
  word-break: break-word;
`;

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
  indexName,
  isAlert,
  isDraggable,
  rawEventData,
  timelineId,
  timelineTabType,
  hostRisk,
  handleOnEventClosed,
  isReadOnly,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<EventViewId>(EventsViewType.summaryView);
  const handleTabClick = useCallback(
    (tab: EuiTabbedContentTab) => setSelectedTabId(tab.id as EventViewId),
    []
  );
  const goToTableTab = useCallback(() => setSelectedTabId(EventsViewType.tableView), []);

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
    result: enrichmentsResponse,
    loading: isEnrichmentsLoading,
    setRange,
    range,
  } = useInvestigationTimeEnrichment(eventFields);

  const allEnrichments = useMemo(() => {
    if (isEnrichmentsLoading || !enrichmentsResponse?.enrichments) {
      return existingEnrichments;
    }
    return filterDuplicateEnrichments([...existingEnrichments, ...enrichmentsResponse.enrichments]);
  }, [isEnrichmentsLoading, enrichmentsResponse, existingEnrichments]);

  const enrichmentCount = allEnrichments.length;

  const summaryTab: EventViewTab | undefined = useMemo(
    () =>
      isAlert
        ? {
            id: EventsViewType.summaryView,
            name: i18n.OVERVIEW,
            content: (
              <>
                <EuiSpacer size="m" />
                <Overview
                  browserFields={browserFields}
                  contextId={timelineId}
                  data={data}
                  eventId={id}
                  indexName={indexName}
                  timelineId={timelineId}
                  handleOnEventClosed={handleOnEventClosed}
                  isReadOnly={isReadOnly}
                />
                <EuiSpacer size="l" />
                <Reason eventId={id} data={data} />
                <RelatedCases eventId={id} />
                <EuiHorizontalRule />
                <AlertSummaryView
                  {...{
                    data,
                    eventId: id,
                    browserFields,
                    isDraggable,
                    timelineId,
                    title: i18n.HIGHLIGHTED_FIELDS,
                    isReadOnly,
                  }}
                  goToTable={goToTableTab}
                />

                {(enrichmentCount > 0 || hostRisk) && (
                  <ThreatSummaryView
                    isDraggable={isDraggable}
                    hostRisk={hostRisk}
                    browserFields={browserFields}
                    data={data}
                    eventId={id}
                    timelineId={timelineId}
                    enrichments={allEnrichments}
                  />
                )}

                {isEnrichmentsLoading && (
                  <>
                    <EuiLoadingContent lines={2} />
                  </>
                )}

                <InvestigationGuideView data={data} />
              </>
            ),
          }
        : undefined,
    [
      id,
      indexName,
      isAlert,
      data,
      browserFields,
      isDraggable,
      timelineId,
      enrichmentCount,
      allEnrichments,
      isEnrichmentsLoading,
      hostRisk,
      goToTableTab,
      handleOnEventClosed,
      isReadOnly,
    ]
  );

  const threatIntelTab = useMemo(
    () =>
      isAlert && !isReadOnly
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
                  {isEnrichmentsLoading ? (
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
              <ThreatDetailsView
                loading={isEnrichmentsLoading}
                enrichments={allEnrichments}
                showInvestigationTimeEnrichments={!isEmpty(eventFields)}
              >
                <>
                  <EnrichmentRangePicker
                    setRange={setRange}
                    loading={isEnrichmentsLoading}
                    range={range}
                  />
                  <EuiSpacer size="m" />
                </>
              </ThreatDetailsView>
            ),
          }
        : undefined,
    [
      allEnrichments,
      setRange,
      range,
      enrichmentCount,
      isAlert,
      eventFields,
      isEnrichmentsLoading,
      isReadOnly,
    ]
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
            isDraggable={isDraggable}
            timelineId={timelineId}
            timelineTabType={timelineTabType}
            isReadOnly={isReadOnly}
          />
        </>
      ),
    }),
    [browserFields, data, id, isDraggable, timelineId, timelineTabType, isReadOnly]
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
            <JsonView rawEventData={rawEventData} />
          </TabContentWrapper>
        </>
      ),
    }),
    [rawEventData]
  );

  const tabs = useMemo(() => {
    return [summaryTab, threatIntelTab, tableTab, jsonTab].filter(
      (tab: EventViewTab | undefined): tab is EventViewTab => !!tab
    );
  }, [summaryTab, threatIntelTab, tableTab, jsonTab]);

  const selectedTab = useMemo(
    () => tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0],
    [tabs, selectedTabId]
  );

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
