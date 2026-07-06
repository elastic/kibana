/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { ServiceOverviewThroughputChart } from '../../../app/service_overview/service_overview_throughput_chart';
import { ContextualServiceMapSection } from '../../../app/service_map/contextual_map/contextual_service_map_section';
import { LatencyChart } from '../latency_chart';
import { TransactionBreakdownChart } from '../transaction_breakdown_chart';
import { TransactionColdstartRateChart } from '../transaction_coldstart_rate_chart';
import { FailedTransactionRateChart } from '../failed_transaction_rate_chart';
import { TopErrors } from '../../../app/transaction_details/top_errors';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import {
  isMobileAgentName,
  isOpenTelemetryAgentName,
  isRumAgentName,
} from '../../../../../common/agent_name';
import type { AgentName } from '../../../../../typings/es_schemas/ui/fields/agent';
import { unit } from '../../../../utils/style';

/** Shared outer height for failed-rate and service-map panels on transaction details row 2. */
const TRANSACTION_DETAILS_ROW_TWO_SECTION_HEIGHT = unit * 24;

export function TransactionCharts({
  kuery,
  environment,
  start,
  end,
  serviceName,
  transactionName,
  rangeFrom,
  rangeTo,
  isServerlessContext,
  comparisonEnabled,
  offset,
}: {
  kuery: string;
  environment: string;
  start: string;
  end: string;
  serviceName: string;
  transactionName?: string;
  rangeFrom?: string;
  rangeTo?: string;
  isServerlessContext?: boolean;
  comparisonEnabled?: boolean;
  offset?: string;
}) {
  // The default EuiFlexGroup breaks at 768, but we want to break at 1200
  const { isLarge } = useBreakpoints();
  const { agentName } = useApmServiceContext();
  const isOpenTelemetryAgent = isOpenTelemetryAgentName(agentName as AgentName);
  const isRumAgent = isRumAgentName(agentName as AgentName);
  const isMobileAgent = isMobileAgentName(agentName as AgentName);
  const rowDirection = isLarge ? 'column' : 'row';
  const showTopErrors = !isOpenTelemetryAgent && !isRumAgent;
  const showTransactionDetailsServiceMap =
    Boolean(transactionName) && Boolean(rangeFrom) && Boolean(rangeTo) && Boolean(serviceName);

  const latencyChart = (
    <EuiFlexItem data-cy={`transaction-duration-charts`}>
      <EuiPanel hasBorder={true}>
        <LatencyChart kuery={kuery} />
      </EuiPanel>
    </EuiFlexItem>
  );

  const serviceOverviewThroughputChart = (
    <EuiFlexItem style={{ flexShrink: 1 }}>
      <ServiceOverviewThroughputChart kuery={kuery} transactionName={transactionName} />
    </EuiFlexItem>
  );

  const coldStartRateOrBreakdownChart = isServerlessContext ? (
    <EuiFlexItem>
      <TransactionColdstartRateChart
        kuery={kuery}
        transactionName={transactionName}
        environment={environment}
        comparisonEnabled={comparisonEnabled}
        offset={offset}
      />
    </EuiFlexItem>
  ) : (
    !isOpenTelemetryAgent && (
      <EuiFlexItem>
        <TransactionBreakdownChart kuery={kuery} environment={environment} />
      </EuiFlexItem>
    )
  );

  const failedTransactionRateChart = (
    <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
      <FailedTransactionRateChart kuery={kuery} />
    </EuiFlexItem>
  );

  const failedTransactionRateChartRowTwo = (
    <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
      <FailedTransactionRateChart
        kuery={kuery}
        sectionHeight={TRANSACTION_DETAILS_ROW_TWO_SECTION_HEIGHT}
      />
    </EuiFlexItem>
  );

  const contextualServiceMapSection = showTransactionDetailsServiceMap ? (
    <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
      <ContextualServiceMapSection
        serviceName={serviceName}
        rangeFrom={rangeFrom!}
        rangeTo={rangeTo!}
        environment={environment}
        kuery={kuery}
        sectionHeight={TRANSACTION_DETAILS_ROW_TWO_SECTION_HEIGHT}
        embeddableMinHeight={0}
        sectionTestSubj="apmTransactionDetailsServiceMapSection"
        exploreLinkTestSubj="apmTransactionDetailsExploreInServiceMap"
        embeddableContainerTestSubj="apmTransactionDetailsServiceMapEmbeddableContainer"
      />
    </EuiFlexItem>
  ) : null;

  const topErrorsPanel = showTopErrors ? (
    <EuiPanel hasBorder={true}>
      <TopErrors />
    </EuiPanel>
  ) : null;

  return (
    <>
      <AnnotationsContextProvider
        serviceName={serviceName}
        environment={environment}
        start={start}
        end={end}
      >
        <ChartPointerEventContextProvider>
          {transactionName ? (
            <>
              <EuiFlexGroup gutterSize="s">
                {latencyChart}
                {serviceOverviewThroughputChart}
                {!isMobileAgent && coldStartRateOrBreakdownChart}
              </EuiFlexGroup>
              <EuiSpacer size="l" />
              <EuiFlexGroup direction={rowDirection} gutterSize="s" responsive={false}>
                {failedTransactionRateChartRowTwo}
                {contextualServiceMapSection}
              </EuiFlexGroup>
              {topErrorsPanel && (
                <>
                  <EuiSpacer size="l" />
                  {topErrorsPanel}
                </>
              )}
            </>
          ) : (
            <>
              <EuiFlexGrid columns={2} gutterSize="s">
                {latencyChart}
                {serviceOverviewThroughputChart}
              </EuiFlexGrid>
              <EuiSpacer size="s" />
              <EuiFlexGroup gutterSize="s">
                {failedTransactionRateChart}
                {coldStartRateOrBreakdownChart}
              </EuiFlexGroup>
            </>
          )}
        </ChartPointerEventContextProvider>
      </AnnotationsContextProvider>
    </>
  );
}
