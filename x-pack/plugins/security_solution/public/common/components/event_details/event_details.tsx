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
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
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
import { NoInvestigationEnrichmentsPanel } from './cti_details/no_investigation_enrichments_panel';
import { NoIndicatorRuleEnrichmentsPanel } from './cti_details/no_indicator_rule_enrichments_panel';

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
  const viewThreatIntelTab = useCallback(() => setSelectedTabId(EventsViewType.threatIntelView), [
    setSelectedTabId,
  ]);

  const eventFields = useMemo(() => getEnrichmentFields(data ?? []), [data]);
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
    setRange,
  } = useInvestigationTimeEnrichment(eventFields);
  const investigationEnrichments = enrichmentsResponse?.enrichments;
  const allEnrichments = useMemo(
    () => filterDuplicateEnrichments([...existingEnrichments, ...(investigationEnrichments ?? [])]),
    [existingEnrichments, investigationEnrichments]
  );
  const enrichmentCount = allEnrichments.length;

  const summaryTab: EventViewTab | undefined = useMemo(
    () =>
      isAlert
        ? {
            id: EventsViewType.summaryView,
            'data-test-subj': 'alert-summary-tab',
            name: i18n.SUMMARY,
            content: (
              <>
                <AlertSummaryView
                  {...{
                    data,
                    eventId: id,
                    browserFields,
                    timelineId,
                    title: i18n.ALERT_SUMMARY,
                  }}
                />
                {enrichmentsLoading && (
                  <>
                    <EuiLoadingContent lines={3} />
                  </>
                )}
                {enrichmentCount > 0 && (
                  <>
                    <ThreatSummaryView
                      eventId={id}
                      timelineId={timelineId}
                      enrichments={allEnrichments}
                    />
                    <EuiSpacer size="s" />
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiButton onClick={viewThreatIntelTab}>{i18n.VIEW_CTI_DATA}</EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
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
      viewThreatIntelTab,
    ]
  );

  const threatIntelTab = useMemo(
    () =>
      isAlert
        ? {
            id: EventsViewType.threatIntelView,
            'data-test-subj': 'threatIntelTab',
            name: (
              <span>
                {`${i18n.THREAT_INTEL} `}
                {enrichmentsLoading ? <EuiLoadingSpinner /> : `(${enrichmentCount})`}
              </span>
            ),
            content: (
              <>
                <EuiSpacer size="l" />
                {existingEnrichments.length < 1 && <NoIndicatorRuleEnrichmentsPanel />}
                {!isEmpty(eventFields) && !investigationEnrichments?.length && (
                  <NoInvestigationEnrichmentsPanel onRangeChange={setRange} />
                )}
                {enrichmentsLoading ? (
                  <>
                    <EuiLoadingContent lines={10} />
                    <EuiLoadingContent lines={10} />
                  </>
                ) : (
                  <ThreatDetailsView enrichments={allEnrichments} />
                )}
              </>
            ),
          }
        : undefined,
    [
      allEnrichments,
      enrichmentCount,
      enrichmentsLoading,
      eventFields,
      existingEnrichments.length,
      investigationEnrichments?.length,
      isAlert,
      setRange,
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
          <TabContentWrapper>
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

  const selectedTab = useMemo(() => tabs.find((tab) => tab.id === selectedTabId), [
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
