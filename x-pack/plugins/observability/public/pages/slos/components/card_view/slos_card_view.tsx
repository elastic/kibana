/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { SLOWithSummaryResponse, ALL_VALUE } from '@kbn/slo-schema';
import { EuiFlexGridProps } from '@elastic/eui/src/components/flex/flex_grid';
import { ActiveAlerts } from '../../../../hooks/slo/active_alerts';
import type { UseFetchRulesForSloResponse } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { useFetchHistoricalSummary } from '../../../../hooks/slo/use_fetch_historical_summary';
import { SloCardItem } from './slo_card_item';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
  activeAlertsBySlo: ActiveAlerts;
  rulesBySlo?: UseFetchRulesForSloResponse['data'];
}

const useColumns = () => {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const isMedium = useIsWithinBreakpoints(['m']);
  const isLarge = useIsWithinBreakpoints(['l', 'xl']);

  switch (true) {
    case isMobile:
      return 1;
    case isMedium:
      return 3;
    case isLarge:
      return 4;
    default:
      return 3;
  }
};

export function SloListCardView({ sloList, loading, error, rulesBySlo, activeAlertsBySlo }: Props) {
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: sloList.map((slo) => ({ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE })),
    });

  const columns = useColumns();

  if (loading && sloList.length === 0) {
    return <LoadingSloGrid gridSize={columns} />;
  }

  return (
    <EuiFlexGrid columns={columns} gutterSize="m">
      {sloList
        .filter((slo) => slo.summary)
        .map((slo) => (
          <EuiFlexItem key={`${slo.id}-${slo.instanceId ?? 'ALL_VALUE'}`}>
            <SloCardItem
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
              cardsPerRow={Number(columns)}
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
