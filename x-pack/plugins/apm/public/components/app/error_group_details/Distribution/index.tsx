/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  Chart,
  BarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiTitle } from '@elastic/eui';
import React, { Suspense, useState } from 'react';
import type { ALERT_RULE_TYPE_ID as ALERT_RULE_TYPE_ID_TYPED } from '@kbn/rule-data-utils';
// @ts-expect-error
import { ALERT_RULE_TYPE_ID as ALERT_RULE_TYPE_ID_NON_TYPED } from '@kbn/rule-data-utils/target_node/technical_field_names';
import { i18n } from '@kbn/i18n';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { offsetPreviousPeriodCoordinates } from '../../../../../common/utils/offset_previous_period_coordinate';
import { useTheme } from '../../../../hooks/use_theme';
import { AlertType } from '../../../../../common/alert_types';
import { getAlertAnnotations } from '../../../shared/charts/helper/get_alert_annotations';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { LazyAlertsFlyout } from '../../../../../../observability/public';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { Coordinate } from '../../../../../typings/timeseries';

const ALERT_RULE_TYPE_ID: typeof ALERT_RULE_TYPE_ID_TYPED =
  ALERT_RULE_TYPE_ID_NON_TYPED;

type ErrorDistributionAPIResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;

export function getCoordinatedBuckets(
  buckets:
    | ErrorDistributionAPIResponse['currentPeriod']
    | ErrorDistributionAPIResponse['previousPeriod']
): Coordinate[] {
  return buckets.map(({ count, key }) => {
    return {
      x: key,
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
  const currentPeriod = getCoordinatedBuckets(distribution.currentPeriod);
  const previousPeriod = getCoordinatedBuckets(distribution.previousPeriod);

  const { urlParams } = useUrlParams();
  const { comparisonEnabled } = urlParams;

  const timeseries = [
    {
      data: currentPeriod,
      color: theme.eui.euiColorVis1,
      title: i18n.translate('xpack.apm.errorGroup.chart.ocurrences', {
        defaultMessage: 'Occurences',
      }),
    },
    ...(comparisonEnabled
      ? [
          {
            data: offsetPreviousPeriodCoordinates({
              currentPeriodTimeseries: currentPeriod,
              previousPeriodTimeseries: previousPeriod,
            }),
            color: theme.eui.euiColorMediumShade,
            title: i18n.translate(
              'xpack.apm.errorGroup.chart.ocurrences.previousPeriodLabel',
              { defaultMessage: 'Previous period' }
            ),
          },
        ]
      : []),
  ];

  const xValues = timeseries.flatMap(({ data }) => data.map(({ x }) => x));

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);

  const xFormatter = niceTimeFormatter([min, max]);
  const { observabilityRuleTypeRegistry } = useApmPluginContext();
  const { alerts } = useApmServiceContext();
  const { getFormatter } = observabilityRuleTypeRegistry;
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(
    undefined
  );

  return (
    <>
      <EuiTitle size="xs">
        <span>{title}</span>
      </EuiTitle>
      <div style={{ height: 256 }}>
        <Chart>
          <Settings
            xDomain={{ min, max }}
            tooltip={{ stickTo: 'top' }}
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

          {timeseries.map((serie) => {
            return (
              <BarSeries
                key={serie.title}
                id={serie.title}
                minBarHeight={2}
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={serie.data}
                color={serie.color}
              />
            );
          })}
          {getAlertAnnotations({
            alerts: alerts?.filter(
              (alert) => alert[ALERT_RULE_TYPE_ID]?.[0] === AlertType.ErrorCount
            ),
            chartStartTime: xValues[0],
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
    </>
  );
}
