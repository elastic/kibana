/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexGroupProps,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { css } from '@emotion/react';
import {
  isOpenTelemetryAgentName,
  isRumAgentName,
  isServerlessAgent,
} from '../../../../common/agent_name';
import { AnnotationsContextProvider } from '../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useTimeRange } from '../../../hooks/use_time_range';
import { AggregatedTransactionsBadge } from '../../shared/aggregated_transactions_badge';
import { FailedTransactionRateChart } from '../../shared/charts/failed_transaction_rate_chart';
import { LatencyChart } from '../../shared/charts/latency_chart';
import { TransactionBreakdownChart } from '../../shared/charts/transaction_breakdown_chart';
import { TransactionColdstartRateChart } from '../../shared/charts/transaction_coldstart_rate_chart';
import { TransactionsTable } from '../../shared/transactions_table';
import { ServiceOverviewDependenciesTable } from './service_overview_dependencies_table';
import { ServiceOverviewErrorsTable } from './service_overview_errors_table';
import { ServiceOverviewInstancesChartAndTable } from './service_overview_instances_chart_and_table';
import { ServiceOverviewThroughputChart } from './service_overview_throughput_chart';
import { SloCallout } from '../../shared/slo_callout';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { ApmPluginStartDeps } from '../../../plugin';
/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

export function ServiceOverview() {
  const router = useApmRouter();
  const { serviceName, fallbackToTransactions, agentName, serverlessType } =
    useApmServiceContext();
  const { embeddable: embeddablePlugin } =
    useKibana<ApmPluginStartDeps>().services;

  const {
    query,
    query: { kuery, environment, rangeFrom, rangeTo, transactionType },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const isRumAgent = isRumAgentName(agentName);
  const isOpenTelemetryAgent = isOpenTelemetryAgentName(agentName as AgentName);
  const isServerless = isServerlessAgent(serverlessType);

  const dependenciesLink = router.link('/services/{serviceName}/dependencies', {
    path: {
      serviceName,
    },
    query,
  });

  // The default EuiFlexGroup breaks at 768, but we want to break at 1200, so we
  // observe the window width and set the flex directions of rows accordingly
  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;

  const latencyChartHeight = 200;
  const nonLatencyChartHeight = isSingleColumn
    ? latencyChartHeight
    : chartHeight;
  const rowDirection: EuiFlexGroupProps['direction'] = isSingleColumn
    ? 'column'
    : 'row';

  const [sloCalloutDismissed, setSloCalloutDismissed] = useLocalStorage(
    'apm.sloCalloutDismissed',
    false
  );

  const [embeddable, setEmbeddable] = useState<any>();
  const embeddableRoot: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);
  useEffect(() => {
    async function createEmbeddable() {
      const fac = embeddablePlugin?.getEmbeddableFactory('HELLO_WORLD');
      const input = { id: 'profling', rangeFrom: start, rangeTo: end };
      const embeddableObject = await fac?.create(input);
      setEmbeddable(embeddableObject);
    }
    createEmbeddable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (embeddableRoot.current && embeddable) {
      embeddable.render(embeddableRoot.current);
    }
  }, [embeddable, embeddableRoot]);

  useEffect(() => {
    if (embeddable) {
      embeddable.updateInput({ rangeFrom: start, rangeTo: end });
      embeddable.reload();
    }
  }, [embeddable, end, start]);

  return (
    <AnnotationsContextProvider
      serviceName={serviceName}
      environment={environment}
      start={start}
      end={end}
    >
      {!sloCalloutDismissed && (
        <SloCallout
          dismissCallout={() => {
            setSloCalloutDismissed(true);
          }}
          serviceName={serviceName}
          environment={environment}
          transactionType={transactionType}
        />
      )}
      <EuiSpacer />
      <div
        css={css`
          width: 100%;
          height: 500px;
          display: flex;
          flex: 1 1 100%;
          z-index: 1;
          min-height: 0;
        `}
        ref={embeddableRoot}
      />
      <ChartPointerEventContextProvider>
        <EuiFlexGroup direction="column" gutterSize="s">
          {fallbackToTransactions && (
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiPanel hasBorder={true}>
              <LatencyChart height={latencyChartHeight} kuery={kuery} />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={rowDirection}
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={3}>
                <ServiceOverviewThroughputChart
                  height={nonLatencyChartHeight}
                  kuery={kuery}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={7}>
                <EuiPanel hasBorder={true}>
                  <TransactionsTable
                    kuery={kuery}
                    environment={environment}
                    fixedHeight={true}
                    isSingleColumn={isSingleColumn}
                    start={start}
                    end={end}
                    showPerPageOptions={false}
                  />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={rowDirection}
              gutterSize="s"
              responsive={false}
            >
              {!isRumAgent && (
                <EuiFlexItem grow={3}>
                  <FailedTransactionRateChart
                    height={nonLatencyChartHeight}
                    showAnnotations={false}
                    kuery={kuery}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={7}>
                <EuiPanel hasBorder={true}>
                  <ServiceOverviewErrorsTable serviceName={serviceName} />
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction={rowDirection}
              gutterSize="s"
              responsive={false}
            >
              {isServerless ? (
                <EuiFlexItem grow={3}>
                  <TransactionColdstartRateChart
                    showAnnotations={false}
                    environment={environment}
                    kuery={kuery}
                  />
                </EuiFlexItem>
              ) : (
                !isOpenTelemetryAgent && (
                  <EuiFlexItem grow={3}>
                    <TransactionBreakdownChart
                      showAnnotations={false}
                      environment={environment}
                      kuery={kuery}
                    />
                  </EuiFlexItem>
                )
              )}
              {!isRumAgent && (
                <EuiFlexItem grow={7}>
                  <EuiPanel hasBorder={true}>
                    <ServiceOverviewDependenciesTable
                      fixedHeight={true}
                      showPerPageOptions={false}
                      link={
                        <EuiLink
                          data-test-subj="apmServiceOverviewViewDependenciesLink"
                          href={dependenciesLink}
                        >
                          {i18n.translate(
                            'xpack.apm.serviceOverview.dependenciesTableTabLink',
                            { defaultMessage: 'View dependencies' }
                          )}
                        </EuiLink>
                      }
                    />
                  </EuiPanel>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {!isRumAgent && !isServerless && (
            <EuiFlexItem>
              <EuiFlexGroup
                direction="column"
                gutterSize="s"
                responsive={false}
              >
                <ServiceOverviewInstancesChartAndTable
                  chartHeight={nonLatencyChartHeight}
                  serviceName={serviceName}
                />
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
