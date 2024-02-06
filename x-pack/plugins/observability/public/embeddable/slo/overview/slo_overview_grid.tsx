/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ALL_VALUE, HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import {
  Chart,
  DARK_THEME,
  isMetricElementEvent,
  Metric,
  MetricTrendShape,
  Settings,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { MetricDatum } from '@elastic/charts/dist/chart_types/metric/specs';
import { useFetchSloList } from '../../../hooks/slo/use_fetch_slo_list';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { useFetchRulesForSlo } from '../../../hooks/slo/use_fetch_rules_for_slo';
import { useFetchActiveAlerts } from '../../../hooks/slo/use_fetch_active_alerts';
import { SloCardBadgesPortal } from '../../../pages/slos/components/card_view/badges_portal';
import { SloCardItemBadges } from '../../../pages/slos/components/card_view/slo_card_item_badges';
import { getSloFormattedSummary } from '../../../pages/slos/hooks/use_slo_summary';
import { useKibana } from '../../../utils/kibana_react';
import {
  getSubTitle,
  useSloCardColor,
} from '../../../pages/slos/components/card_view/slo_card_item';
import { useFetchHistoricalSummary } from '../../../hooks/slo/use_fetch_historical_summary';

const getSloChartData = ({
  slo,
  historicalSummary,
  subTitle,
  cardColor,
  sliValue,
  sloTarget,
}: {
  slo: SLOWithSummaryResponse;
  subTitle: string;
  cardColor: string;
  sliValue: string;
  sloTarget: string;
  historicalSummary?: HistoricalSummaryResponse[];
}) => {
  const historicalSliData = formatHistoricalData(historicalSummary, 'sli_value');

  return {
    title: slo.name,
    subtitle: subTitle,
    value: sliValue,
    trendShape: MetricTrendShape.Area,
    trend: historicalSliData?.map((d) => ({
      x: d.key as number,
      y: d.value as number,
    })),
    extra: (
      <FormattedMessage
        id="xpack.observability.sLOGridItem.targetFlexItemLabel"
        defaultMessage="Target {target}"
        values={{
          target: sloTarget,
        }}
      />
    ),
    icon: () => <EuiIcon type="visGauge" size="l" />,
    color: cardColor,
  };
};

export function SloCardChartList({ sloId }: { sloId: string }) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    uiSettings,
  } = useKibana().services;

  const kqlQuery = `slo.id:"${sloId}"`;

  const { data: sloList, isLoading } = useFetchSloList({
    kqlQuery,
  });

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: [[sloId, ALL_VALUE]],
  });

  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: [sloId],
  });

  const { data: historicalSummaries = [] } = useFetchHistoricalSummary({
    list: [
      {
        sloId,
        instanceId: ALL_VALUE,
      },
    ],
  });

  const containerRef = React.useRef<HTMLDivElement>(null);

  const { colors } = useSloCardColor();
  const chartsData: MetricDatum[][] = [[]];
  sloList?.results.forEach((slo) => {
    const subTitle = getSubTitle(slo);
    const cardColor = colors[slo.summary.status ?? 'NO_DATA'];
    const { sliValue, sloTarget } = getSloFormattedSummary(slo, uiSettings, basePath);

    const historicalSummary =
      historicalSummaries.find(
        (hist) => hist.sloId === slo.id && hist.instanceId === (slo.instanceId ?? ALL_VALUE)
      )?.data ?? [];

    const lastArray = chartsData[chartsData.length - 1];
    if (lastArray.length >= 4) {
      // If the last array has reached its maximum length, create a new array
      chartsData.push([]);
    }

    const data = getSloChartData({
      slo,
      subTitle,
      cardColor,
      sliValue,
      sloTarget,
      historicalSummary,
    });
    chartsData[chartsData.length - 1].push(data);
  });

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: '100%' }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <Chart>
        <Settings
          baseTheme={DARK_THEME}
          onElementClick={([d]) => {
            if (isMetricElementEvent(d)) {
              const { columnIndex, rowIndex } = d;
              const slo = sloList?.results[rowIndex * 4 + columnIndex];
              const { sloDetailsUrl } = getSloFormattedSummary(slo!, uiSettings, basePath);
              navigateToUrl(sloDetailsUrl);
            }
          }}
          locale={i18n.getLocale()}
        />
        <Metric id={`slo-id-instances`} data={chartsData} />
      </Chart>
      {sloList?.results.map((slo, index) => {
        const rules = rulesBySlo?.[slo?.id];
        const activeAlerts = activeAlertsBySlo.get(slo);
        const hasGroupBy = Boolean(slo.groupBy && slo.groupBy !== ALL_VALUE);

        return (
          <div key={slo.id + slo.instanceId}>
            <SloCardBadgesPortal containerRef={containerRef} index={index}>
              <SloCardItemBadges
                slo={slo}
                rules={rules}
                activeAlerts={activeAlerts}
                handleCreateRule={() => {}}
                hasGroupBy={hasGroupBy}
              />
            </SloCardBadgesPortal>
          </div>
        );
      })}
    </div>
  );
}
