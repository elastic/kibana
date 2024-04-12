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
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';

import { ErrorBudgetChart } from '../../../pages/slo_details/components/error_budget_chart';
import { EmbeddableSloProps } from './types';
import { SloOverviewDetails } from '../common/slo_overview_details'; // TODO change to slo_details
import { ErrorBudgetHeader } from '../../../pages/slo_details/components/error_budget_header';
import { SLOGroupings } from '../../../pages/slos/components/common/slo_groupings';

export function SloErrorBudget({
  sloId,
  sloInstanceId,
  onRenderComplete,
  reloadSubject,
}: EmbeddableSloProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSlo, setSelectedSlo] = useState<SLOWithSummaryResponse | null>(null);
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
          {i18n.translate('xpack.slo.sloEmbeddable.overview.sloNotFoundText', {
            defaultMessage:
              'The SLO has been deleted. You can safely delete the widget from the dashboard.',
          })}
        </LoadingContent>
      </LoadingContainer>
    );
  }
  const hasGroupBy = slo.instanceId !== ALL_VALUE;
  return (
    <div ref={containerRef} style={{ width: '100%', padding: 10 }}>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiLink
            css={{ fontSize: '16px' }}
            data-test-subj="o11ySloErrorBudgetLink"
            onClick={() => {
              setSelectedSlo(slo);
            }}
          >
            <h4>{slo.name}</h4>
          </EuiLink>
        </EuiFlexItem>

        {hasGroupBy && (
          <EuiFlexItem grow={false}>
            <SLOGroupings slo={slo} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiFlexGroup direction="column" gutterSize="l">
        <ErrorBudgetHeader showTitle={false} slo={slo} />
        <ErrorBudgetChart
          data={errorBudgetBurnDownData}
          isLoading={historicalSummaryLoading}
          slo={slo!}
        />
      </EuiFlexGroup>

      <SloOverviewDetails slo={selectedSlo} setSelectedSlo={setSelectedSlo} />
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
