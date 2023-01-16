/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiLoadingContent,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash';

import type { SearchHit } from '../../../../common/search_strategy';
import { getMitreComponentParts } from '../../../detections/mitre/get_mitre_threat_component';
import { GuidedOnboardingTourStep } from '../guided_onboarding_tour/tour_step';
import { isDetectionsAlertsTable } from '../top_n/helpers';
import {
  AlertsCasesTourSteps,
  getTourAnchor,
  SecurityStepId,
} from '../guided_onboarding_tour/tour_config';
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
  scopeId: string;
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

const ThreatTacticContainer = styled(EuiFlexGroup)`
  flex-wrap: nowrap;
  & .euiFlexGroup {
    flex-wrap: nowrap;
  }
`;

const ThreatTacticDescription = styled.div`
  padding-left: ${(props) => props.theme.eui.euiSizeL};
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
  scopeId,
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

  const threatDetails = useMemo(
    () => getMitreComponentParts(rawEventData as SearchHit),
    [rawEventData]
  );
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

  const isTourAnchor = useMemo(() => isDetectionsAlertsTable(scopeId), [scopeId]);

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
                  contextId={scopeId}
                  data={data}
                  eventId={id}
                  indexName={indexName}
                  scopeId={scopeId}
                  handleOnEventClosed={handleOnEventClosed}
                  isReadOnly={isReadOnly}
                />
                <EuiSpacer size="l" />
                <ThreatTacticContainer direction="column" wrap={false} gutterSize="none">
                  {threatDetails && threatDetails[0] && (
                    <>
                      <EuiTitle size="xxs">
                        <h5>{threatDetails[0].title}</h5>
                      </EuiTitle>
                      <ThreatTacticDescription>
                        {threatDetails[0].description}
                      </ThreatTacticDescription>
                    </>
                  )}
                </ThreatTacticContainer>
                <EuiSpacer size="l" />
                {renderer != null && detailsEcsData != null && (
                  <div>
                    <EuiTitle size="xs">
                      <h5>{i18n.ALERT_REASON}</h5>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <RendererContainer data-test-subj="renderer">
                      {renderer.renderRow({
                        contextId: EVENT_DETAILS_CONTEXT_ID,
                        data: detailsEcsData,
                        isDraggable: isDraggable ?? false,
                        scopeId,
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
                    scopeId,
                    title: i18n.HIGHLIGHTED_FIELDS,
                    isReadOnly,
                  }}
                  goToTable={goToTableTab}
                />
                <EuiSpacer size="xl" />
                <Insights
                  browserFields={browserFields}
                  eventId={id}
                  data={data}
                  scopeId={scopeId}
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
                    scopeId={scopeId}
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
      isAlert,
      browserFields,
      scopeId,
      data,
      id,
      indexName,
      handleOnEventClosed,
      isReadOnly,
      renderer,
      detailsEcsData,
      isDraggable,
      goToTableTab,
      threatDetails,
      showThreatSummary,
      hostRisk,
      userRisk,
      allEnrichments,
      isEnrichmentsLoading,
    ]
  );

  const threatIntelTab = useMemo(
    () =>
      isAlert && !isReadOnly
        ? {
            id: EventsViewType.threatIntelView,
            'data-test-subj': 'threatIntelTab',
            name: i18n.THREAT_INTEL,
            append: (
              <>
                {isEnrichmentsLoading ? (
                  <EuiLoadingSpinner />
                ) : (
                  <EuiNotificationBadge data-test-subj="enrichment-count-notification">
                    {enrichmentCount}
                  </EuiNotificationBadge>
                )}
              </>
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
            scopeId={scopeId}
            timelineTabType={timelineTabType}
            isReadOnly={isReadOnly}
          />
        </>
      ),
    }),
    [browserFields, data, id, isDraggable, scopeId, timelineTabType, isReadOnly]
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
    ...(detailsEcsData !== null ? { ecsData: detailsEcsData } : {}),
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

  const tourAnchor = useMemo(
    () => (isTourAnchor ? { 'tour-step': getTourAnchor(3, SecurityStepId.alertsCases) } : {}),
    [isTourAnchor]
  );

  return (
    <GuidedOnboardingTourStep
      isTourAnchor={isTourAnchor}
      step={AlertsCasesTourSteps.reviewAlertDetailsFlyout}
      tourId={SecurityStepId.alertsCases}
    >
      <>
        <EuiSpacer size="s" />
        <StyledEuiTabbedContent
          {...tourAnchor}
          data-test-subj="eventDetails"
          tabs={tabs}
          selectedTab={selectedTab}
          onTabClick={handleTabClick}
          key="event-summary-tabs"
        />
      </>
    </GuidedOnboardingTourStep>
  );
};
EventDetailsComponent.displayName = 'EventDetailsComponent';

export const EventDetails = React.memo(EventDetailsComponent);
