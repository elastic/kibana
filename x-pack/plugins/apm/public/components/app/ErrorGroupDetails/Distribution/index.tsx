/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  SettingsSpec,
  TooltipValue,
} from '@elastic/charts';
import { EuiTitle } from '@elastic/eui';
import d3 from 'd3';
import React, { Suspense, useState } from 'react';
import { RULE_ID } from '@kbn/rule-data-utils/target/technical_field_names';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { asRelativeDateTimeRange } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/use_theme';
import { AlertType } from '../../../../../common/alert_types';
import { getAlertAnnotations } from '../../../shared/charts/helper/get_alert_annotations';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { LazyAlertsFlyout } from '../../../../../../observability/public';

type ErrorDistributionAPIResponse = APIReturnType<'GET /api/apm/services/{serviceName}/errors/distribution'>;

interface FormattedBucket {
  x0: number;
  x: number;
  y: number | undefined;
}

export function getFormattedBuckets(
  buckets: ErrorDistributionAPIResponse['buckets'],
  bucketSize: number
): FormattedBucket[] {
  return buckets.map(({ count, key }) => {
    return {
      x0: key,
      x: key + bucketSize,
      y: count,
    };
  });
}

interface Props {
  distribution: ErrorDistributionAPIResponse;
  title: React.ReactNode;
}

export function ErrorDistribution({ distribution, title }: Props) {
  const theme = useTheme();
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  const xMin = d3.min(buckets, (d) => d.x0);
  const xMax = d3.max(buckets, (d) => d.x0);

  const xFormatter = niceTimeFormatter([xMin, xMax]);
  const { observabilityRuleTypeRegistry } = useApmPluginContext();
  const { alerts } = useApmServiceContext();
  const { getFormatter } = observabilityRuleTypeRegistry;
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(
    undefined
  );

  const tooltipProps: SettingsSpec['tooltip'] = {
    headerFormatter: (tooltip: TooltipValue) => {
      const serie = buckets.find((bucket) => bucket.x0 === tooltip.value);
      if (serie) {
        return asRelativeDateTimeRange(serie.x0, serie.x);
      }
      return `${tooltip.value}`;
    },
  };

  return (
    <div>
      <EuiTitle size="xs">
        <span>{title}</span>
      </EuiTitle>
      <div style={{ height: 180 }}>
        <Chart>
          <Settings
            xDomain={{ min: xMin, max: xMax }}
            tooltip={tooltipProps}
            showLegend
            showLegendExtra
            legendPosition={Position.Bottom}
          />
          <Axis
            id="x-axis"
            position={Position.Bottom}
            showOverlappingTicks
            tickFormat={xFormatter}
          />
          <Axis
            id="y-axis"
            position={Position.Left}
            ticks={2}
            gridLine={{ visible: true }}
          />
          <HistogramBarSeries
            minBarHeight={2}
            id="errorOccurrences"
            name="Occurences"
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x0"
            yAccessors={['y']}
            data={buckets}
            color={theme.eui.euiColorVis1}
          />
          {getAlertAnnotations({
            alerts: alerts?.filter(
              (alert) => alert[RULE_ID]?.[0] === AlertType.ErrorCount
            ),
            chartStartTime: buckets[0].x0,
            getFormatter,
            selectedAlertId,
            setSelectedAlertId,
            theme,
          })}
          <Suspense fallback={null}>
            <LazyAlertsFlyout
              alerts={alerts}
              isInApp={true}
              observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
              onClose={() => {
                setSelectedAlertId(undefined);
              }}
              selectedAlertId={selectedAlertId}
            />
          </Suspense>
        </Chart>
      </div>
    </div>
  );
}
