/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiHorizontalRule,
  EuiTabbedContent,
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

import type { AlertRawEventData } from './osquery_tab';
import { useOsqueryTab } from './osquery_tab';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import { ThreatSummaryView } from './cti_details/threat_summary_view';
import { ThreatDetailsView } from './cti_details/threat_details_view';
import * as i18n from './translations';
import { AlertSummaryView } from './alert_summary_view';
import type { Ecs } from '../../../../common/ecs';
import type { BrowserFields } from '../../containers/source';
import { useInvestigationTimeEnrichment } from '../../containers/cti/event_enrichment';
import type { TimelineEventsDetailsItem } from '../../../../common/search_strategy/timeline';
import type { TimelineTabs } from '../../../../common/types/timeline';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  timelineDataToEnrichment,
} from './cti_details/helpers';
import { EnrichmentRangePicker } from './cti_details/enrichment_range_picker';
import { InvestigationGuideView } from './investigation_guide_view';
import { Overview } from './overview';
import { Insights } from './insights/insights';
import { useRiskScoreData } from './use_risk_score_data';
import { getRowRenderer } from '../../../timelines/components/timeline/body/renderers/get_row_renderer';
import { DETAILS_CLASS_NAME } from '../../../timelines/components/timeline/body/renderers/helpers';
import { defaultRowRenderers } from '../../../timelines/components/timeline/body/renderers';

export const EVENT_DETAILS_CONTEXT_ID = 'event-details';

type EventViewTab = EuiTabbedContentTab;

export type EventViewId =
  | EventsViewType.tableView
  | EventsViewType.jsonView
  | EventsViewType.summaryView
  | EventsViewType.threatIntelView
  | EventsViewType.osqueryView;

export enum EventsViewType {
  tableView = 'table-view',
  jsonView = 'json-view',
  summaryView = 'summary-view',
  threatIntelView = 'threat-intel-view',
  osqueryView = 'osquery-results-view',
}

interface Props {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  detailsEcsData: Ecs | null;
  id: string;
  indexName: string;
  isAlert: boolean;
  isDraggable?: boolean;
  rawEventData: object | undefined;
  timelineTabType: TimelineTabs | 'flyout';
  timelineId: string;
  handleOnEventClosed: () => void;
  isReadOnly?: boolean;
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

const RendererContainer = styled.div`
  overflow-x: auto;
  padding-right: ${(props) => props.theme.eui.euiSizeXS};

  & .${DETAILS_CLASS_NAME} .euiFlexGroup {
    justify-content: flex-start;
  }
`;

const EventDetailsComponent: React.FC<Props> = ({
  browserFields,
  data,
  detailsEcsData,
  id,
  indexName,
  isAlert,
  isDraggable,
  rawEventData,
  timelineId,
  timelineTabType,
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

  const { hostRisk, userRisk, isLicenseValid } = useRiskScoreData(data);

  const renderer = useMemo(
    () =>
      detailsEcsData != null
        ? getRowRenderer({ data: detailsEcsData, rowRenderers: defaultRowRenderers })
        : null,
    [detailsEcsData]
  );

  const showThreatSummary = useMemo(() => {
    const hasEnrichments = enrichmentCount > 0;
    const hasRiskInfoWithLicense = isLicenseValid && (hostRisk || userRisk);
    return hasEnrichments || hasRiskInfoWithLicense;
  }, [enrichmentCount, hostRisk, isLicenseValid, userRisk]);

  const summaryTab: EventViewTab | undefined = useMemo(
    () =>
      isAlert
        ? {
            id: EventsViewType.summaryView,
            name: i18n.OVERVIEW,
            'data-test-subj': 'overviewTab',
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

                {renderer != null && detailsEcsData != null && (
                  <div>
                    <RendererContainer data-test-subj="renderer">
                      {renderer.renderRow({
                        contextId: EVENT_DETAILS_CONTEXT_ID,
                        data: detailsEcsData,
                        isDraggable: isDraggable ?? false,
                        timelineId,
                      })}
                    </RendererContainer>
                  </div>
                )}

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

                <EuiSpacer size="l" />
                <Insights
                  browserFields={browserFields}
                  eventId={id}
                  data={data}
                  timelineId={timelineId}
                  isReadOnly={isReadOnly}
                />

                {showThreatSummary && (
                  <ThreatSummaryView
                    isDraggable={isDraggable}
                    hostRisk={hostRisk}
                    userRisk={userRisk}
                    browserFields={browserFields}
                    data={data}
                    eventId={id}
                    timelineId={timelineId}
                    enrichments={allEnrichments}
                    isReadOnly={isReadOnly}
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
      allEnrichments,
      browserFields,
      data,
      detailsEcsData,
      goToTableTab,
      handleOnEventClosed,
      hostRisk,
      id,
      indexName,
      isAlert,
      isDraggable,
      isEnrichmentsLoading,
      showThreatSummary,
      isReadOnly,
      renderer,
      timelineId,
      userRisk,
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

  const osqueryTab = useOsqueryTab({
    rawEventData: rawEventData as AlertRawEventData,
  });

  const tabs = useMemo(() => {
    return [summaryTab, threatIntelTab, tableTab, jsonTab, osqueryTab].filter(
      (tab: EventViewTab | undefined): tab is EventViewTab => !!tab
    );
  }, [summaryTab, threatIntelTab, tableTab, jsonTab, osqueryTab]);

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
