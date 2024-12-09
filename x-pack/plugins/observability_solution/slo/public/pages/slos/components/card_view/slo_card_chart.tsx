/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Chart, isMetricElementEvent, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSloFormattedSummary } from '../../hooks/use_slo_summary';
import { useSloCardColors } from './hooks/use_slo_card_colors';
import { getFirstGrouping } from './utils/get_first_grouping';

export function SloCardChart({
  slo,
  badges,
  onClick,
  historicalSliData,
}: {
  badges: React.ReactNode;
  slo: SLOWithSummaryResponse;
  historicalSliData?: Array<{ key?: number; value?: number }>;
  onClick?: () => void;
}) {
  const {
    application: { navigateToUrl },
    charts,
  } = useKibana().services;

  const cardColors = useSloCardColors();
  const subTitle = getFirstGrouping(slo);

  const { sliValue, sloTarget, sloDetailsUrl } = useSloFormattedSummary(slo);

  return (
    <Chart>
      <Settings
        baseTheme={charts.theme.useChartsBaseTheme()}
        theme={{
          metric: {
            iconAlign: 'right',
          },
        }}
        onElementClick={([d]) => {
          if (onClick) {
            onClick();
          } else {
            if (isMetricElementEvent(d)) {
              navigateToUrl(sloDetailsUrl);
            }
          }
        }}
        locale={i18n.getLocale()}
      />
      <Metric
        id={`${slo.id}-${slo.instanceId}`}
        data={[
          [
            {
              title: slo.name,
              subtitle: subTitle,
              value: sliValue,
              trendA11yTitle: i18n.translate('xpack.slo.slo.sLOGridItem.trendA11yLabel', {
                defaultMessage: `The "{title}" trend`,
                values: {
                  title: slo.name,
                },
              }),
              trendShape: MetricTrendShape.Area,
              trend: historicalSliData?.map((d) => ({
                x: d.key as number,
                y: d.value as number,
              })),
              extra: (
                <FormattedMessage
                  id="xpack.slo.sLOGridItem.targetFlexItemLabel"
                  defaultMessage="Target {target}"
                  values={{
                    target: sloTarget,
                  }}
                />
              ),
              icon: () => <EuiIcon type="visGauge" size="l" />,
              color: cardColors[slo.summary.status],
              body: badges,
            },
          ],
        ]}
      />
    </Chart>
  );
}
