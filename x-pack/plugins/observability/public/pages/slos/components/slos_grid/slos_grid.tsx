/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSkeletonText } from '@elastic/eui';
import { SLOWithSummaryResponse, ALL_VALUE } from '@kbn/slo-schema';
import { EuiFlexGridProps } from '@elastic/eui/src/components/flex/flex_grid';
import { SloListEmpty } from '../slo_list_empty';
import { SloListError } from '../slo_list_error';
import { useFetchActiveAlerts } from '../../../../hooks/slo/use_fetch_active_alerts';
import { useFetchRulesForSlo } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { useFetchHistoricalSummary } from '../../../../hooks/slo/use_fetch_historical_summary';
import { SloGridItem } from './slo_grid_item';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
  gridSize?: string;
}

export function SloGrid({ sloList, loading, error, gridSize }: Props) {
  const sloIdsAndInstanceIds = sloList.map(
    (slo) => [slo.id, slo.instanceId ?? ALL_VALUE] as [string, string]
  );

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIdsAndInstanceIds });
  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloIdsAndInstanceIds.map((item) => item[0]),
  });
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: sloList.map((slo) => ({ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE })),
    });

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }
  if (!loading && error) {
    return <SloListError />;
  }

  if (loading && sloList.length === 0) {
    return <LoadingSloGrid gridSize={Number(gridSize)} />;
  }

  return (
    <EuiFlexGrid columns={Number(gridSize) as EuiFlexGridProps['columns']}>
      {sloList.map((slo) => (
        <EuiFlexItem key={`${slo.id}-${slo.instanceId ?? 'ALL_VALUE'}`}>
          <SloGridItem
            slo={slo}
            loading={loading}
            error={error}
            activeAlerts={activeAlertsBySlo.get(slo)}
            rules={rulesBySlo?.[slo.id]}
            historicalSummary={
              historicalSummaries.find(
                (historicalSummary) =>
                  historicalSummary.sloId === slo.id &&
                  historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
              )?.data
            }
            historicalSummaryLoading={historicalSummaryLoading}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  );
}

function LoadingSloGrid({ gridSize }: { gridSize: number }) {
  const ROWS = 4;
  const COLUMNS = gridSize;
  const loaders = Array(ROWS * COLUMNS).fill(null);
  return (
    <>
      <EuiFlexGrid gutterSize="m" columns={COLUMNS as EuiFlexGridProps['columns']}>
        {loaders.map((_, i) => (
          <EuiFlexItem key={i}>
            <EuiPanel style={{ height: '200px' }} hasBorder={true}>
              <EuiSkeletonText lines={2} />
            </EuiPanel>{' '}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </>
  );
}
