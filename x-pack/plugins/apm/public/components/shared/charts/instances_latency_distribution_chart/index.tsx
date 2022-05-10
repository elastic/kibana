/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BubbleSeries,
  Chart,
  ElementClickListener,
  GeometryValue,
  Position,
  ScaleType,
  Settings,
  TooltipInfo,
  TooltipProps,
  TooltipType,
} from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { SERVICE_NODE_NAME } from '../../../../../common/elasticsearch_fieldnames';
import {
  asTransactionRate,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import * as urlHelpers from '../../links/url_helpers';
import { ChartContainer } from '../chart_container';
import { getResponseTimeTickFormatter } from '../transaction_charts/helper';
import { CustomTooltip } from './custom_tooltip';

type ApiResponseMainStats =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;

export interface InstancesLatencyDistributionChartProps {
  height: number;
  items?: ApiResponseMainStats['currentPeriod'];
  status: FETCH_STATUS;
  comparisonItems?: ApiResponseMainStats['previousPeriod'];
}

export function InstancesLatencyDistributionChart({
  height,
  items = [],
  status,
  comparisonItems = [],
}: InstancesLatencyDistributionChartProps) {
  const history = useHistory();
  const hasData = items.length > 0;

  const theme = useTheme();
  const chartTheme = useChartTheme();

  const maxLatency = Math.max(...items.map((item) => item.latency ?? 0));
  const latencyFormatter = getDurationFormatter(maxLatency);

  const tooltip: TooltipProps = {
    stickTo: 'center',
    type: TooltipType.Follow,
    snap: false,
    customTooltip: (props: TooltipInfo) => (
      <CustomTooltip {...props} latencyFormatter={latencyFormatter} />
    ),
  };

  /**
   * Handle click events on the items.
   *
   * Due to how we handle filtering by using the kuery bar, it's difficult to
   * modify existing queries. If you have an existing query in the bar, this will
   * wipe it out. This is ok for now, since we probably will be replacing this
   * interaction with something nicer in a future release.
   *
   * The event object has an array two items for each point, one of which has
   * the serviceNodeName, so we flatten the list and get the items we need to
   * form a query.
   */
  const handleElementClick: ElementClickListener = (event) => {
    const serviceNodeNamesQuery = event
      .flat()
      .flatMap((value) => (value as GeometryValue).datum?.serviceNodeName)
      .filter((serviceNodeName) => !!serviceNodeName)
      .map((serviceNodeName) => `${SERVICE_NODE_NAME}:"${serviceNodeName}"`)
      .join(' OR ');

    urlHelpers.push(history, { query: { kuery: serviceNodeNamesQuery } });
  };

  // With a linear scale, if all the instances have similar throughput (or if
  // there's just a single instance) they'll show along the origin. Make sure
  // the x-axis domain is [0, maxThroughput].
  const maxThroughput = Math.max(...items.map((item) => item.throughput ?? 0));
  const maxComparisonThroughput = Math.max(
    ...comparisonItems.map((item) => item.throughput ?? 0)
  );
  const xDomain = {
    min: 0,
    max: Math.max(maxThroughput, maxComparisonThroughput),
  };

  return (
    <EuiPanel hasBorder={true}>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.instancesLatencyDistributionChartTitle', {
            defaultMessage: 'Instances latency distribution',
          })}
        </h2>
      </EuiTitle>
      <ChartContainer
        hasData={hasData}
        height={height}
        status={status}
        id="instancesLatencyDistribution"
      >
        <Chart>
          <Settings
            legendPosition={Position.Bottom}
            onElementClick={handleElementClick}
            tooltip={tooltip}
            showLegend
            theme={chartTheme}
            xDomain={xDomain}
          />
          <BubbleSeries
            color={theme.eui.euiColorVis0}
            data={items}
            id={i18n.translate(
              'xpack.apm.instancesLatencyDistributionChartLegend',
              { defaultMessage: 'Instances' }
            )}
            xAccessor={(item) => item.throughput}
            xScaleType={ScaleType.Linear}
            yAccessors={[(item) => item.latency]}
            yScaleType={ScaleType.Linear}
            bubbleSeriesStyle={{
              point: {
                strokeWidth: 0,
                radius: 4,
                fill: theme.eui.euiColorVis0,
              },
            }}
          />

          {!!comparisonItems.length && (
            <BubbleSeries
              data={comparisonItems}
              id={i18n.translate(
                'xpack.apm.instancesLatencyDistributionChartLegend.previousPeriod',
                { defaultMessage: 'Previous period' }
              )}
              xAccessor={(item) => item.throughput}
              xScaleType={ScaleType.Linear}
              yAccessors={[(item) => item.latency]}
              yScaleType={ScaleType.Linear}
              color={theme.eui.euiColorMediumShade}
              bubbleSeriesStyle={{
                point: {
                  shape: 'square',
                  radius: 4,
                  fill: theme.eui.euiColorLightestShade,
                  stroke: theme.eui.euiColorMediumShade,
                  strokeWidth: 2,
                },
              }}
            />
          )}
          <Axis
            id="x-axis"
            labelFormat={asTransactionRate}
            position={Position.Bottom}
          />
          <Axis
            id="y-axis"
            labelFormat={getResponseTimeTickFormatter(latencyFormatter)}
            position={Position.Left}
            ticks={3}
          />
        </Chart>
      </ChartContainer>
    </EuiPanel>
  );
}
