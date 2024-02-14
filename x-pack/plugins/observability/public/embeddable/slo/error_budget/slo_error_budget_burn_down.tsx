/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiLink } from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ALL_VALUE } from '@kbn/slo-schema';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { useFetchSloDetails } from '../../../hooks/slo/use_fetch_slo_details';

import { ErrorBudgetChart } from '../../../pages/slo_details/components/error_budget_chart';
import { EmbeddableSloProps } from './types';

export function SloErrorBudget({
  sloId,
  sloInstanceId,
  onRenderComplete,
  reloadSubject,
}: EmbeddableSloProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    reloadSubject?.subscribe(() => {
      setLastRefreshTime(Date.now());
    });
    return () => {
      reloadSubject?.unsubscribe();
    };
  }, [reloadSubject]);

  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: [{ sloId: sloId!, instanceId: sloInstanceId ?? ALL_VALUE }],
      shouldRefetch: false,
    });

  const sloHistoricalSummary = historicalSummaries.find(
    (historicalSummary) =>
      historicalSummary.sloId === sloId &&
      historicalSummary.instanceId === (sloInstanceId ?? ALL_VALUE)
  );

  const errorBudgetBurnDownData = formatHistoricalData(
    sloHistoricalSummary?.data,
    'error_budget_remaining'
  );

  const {
    isLoading,
    data: slo,
    refetch,
    isRefetching,
  } = useFetchSloDetails({
    sloId,
    instanceId: sloInstanceId,
  });

  useEffect(() => {
    refetch();
  }, [lastRefreshTime, refetch]);
  useEffect(() => {
    if (!onRenderComplete) return;

    if (!isLoading) {
      onRenderComplete();
    }
  }, [isLoading, onRenderComplete]);

  const isSloNotFound = !isLoading && slo === undefined;

  if (isRefetching || isLoading || !slo) {
    return (
      <LoadingContainer>
        <LoadingContent>
          <EuiLoadingChart />
        </LoadingContent>
      </LoadingContainer>
    );
  }

  if (isSloNotFound) {
    return (
      <LoadingContainer>
        <LoadingContent>
          {i18n.translate('xpack.observability.sloEmbeddable.overview.sloNotFoundText', {
            defaultMessage:
              'The SLO has been deleted. You can safely delete the widget from the dashboard.',
          })}
        </LoadingContent>
      </LoadingContainer>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', padding: 10 }}>
      <EuiFlexGroup justifyContent="flexEnd" wrap>
        <EuiFlexItem grow={false}>
          <EuiLink data-test-subj="o11ySloErrorBudgetLink" onClick={() => {}}>
            {slo.name}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup direction="column" gutterSize="l">
        <ErrorBudgetChart
          data={errorBudgetBurnDownData}
          isLoading={historicalSummaryLoading}
          slo={slo!}
        />
      </EuiFlexGroup>
    </div>
  );
}

export const LoadingContainer = euiStyled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

export const LoadingContent = euiStyled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
`;
