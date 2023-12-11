/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLoadingChart } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ALL_VALUE } from '@kbn/slo-schema';
import { SloCardBadgesPortal } from '../../../pages/slos/components/card_view/badges_portal';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { useFetchRulesForSlo } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { SloCardItemBadges } from '../../../pages/slos/components/card_view/slo_card_item_badges';
import { SloCardChart } from '../../../pages/slos/components/card_view/slo_card_item';
import { useFetchSloDetails } from '../../../hooks/slo/use_fetch_slo_details';

import { EmbeddableSloProps } from './types';

export function SloOverview({
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

  const {
    isLoading,
    data: slo,
    refetch,
    isRefetching,
  } = useFetchSloDetails({
    sloId,
    instanceId: sloInstanceId,
  });

  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloId ? [sloId] : [],
  });

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slo ? [[slo.id, slo.instanceId ?? ALL_VALUE] as [string, string]] : [],
  });

  const { data: historicalSummaries = [] } = useFetchHistoricalSummary({
    list: slo ? [{ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE }] : [],
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

  const rules = rulesBySlo?.[slo?.id];
  const activeAlerts = activeAlertsBySlo.get(slo);

  const hasGroupBy = Boolean(slo.groupBy && slo.groupBy !== ALL_VALUE);

  const historicalSummary = historicalSummaries.find(
    (histSummary) =>
      histSummary.sloId === slo.id && histSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
  )?.data;

  const historicalSliData = formatHistoricalData(historicalSummary, 'sli_value');

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <SloCardChart slo={slo} historicalSliData={historicalSliData ?? []} />
      <SloCardBadgesPortal containerRef={containerRef}>
        <SloCardItemBadges
          slo={slo}
          rules={rules}
          activeAlerts={activeAlerts}
          hasGroupBy={hasGroupBy}
        />
      </SloCardBadgesPortal>
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
