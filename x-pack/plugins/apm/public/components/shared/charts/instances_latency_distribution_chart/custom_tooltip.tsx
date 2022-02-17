/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TooltipInfo } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { getServiceNodeName } from '../../../../../common/service_nodes';
import {
  asTransactionRate,
  TimeFormatter,
} from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/use_theme';

type ServiceInstanceMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type MainStatsServiceInstanceItem =
  ServiceInstanceMainStatistics['currentPeriod'][0];

const latencyLabel = i18n.translate(
  'xpack.apm.instancesLatencyDistributionChartTooltipLatencyLabel',
  {
    defaultMessage: 'Latency',
  }
);

const throughputLabel = i18n.translate(
  'xpack.apm.instancesLatencyDistributionChartTooltipThroughputLabel',
  {
    defaultMessage: 'Throughput',
  }
);

const clickToFilterDescription = i18n.translate(
  'xpack.apm.instancesLatencyDistributionChartTooltipClickToFilterDescription',
  { defaultMessage: 'Click to filter by instance' }
);

/**
 * Tooltip for a single instance
 */
function SingleInstanceCustomTooltip({
  latencyFormatter,
  values,
}: {
  latencyFormatter: TimeFormatter;
  values: TooltipInfo['values'];
}) {
  const value = values[0];
  const { color } = value;
  const datum = value.datum as unknown as MainStatsServiceInstanceItem;
  const { latency, serviceNodeName, throughput } = datum;

  return (
    <>
      <div className="echTooltip__header">
        {getServiceNodeName(serviceNodeName)}
      </div>
      <div className="echTooltip__list">
        <div className="echTooltip__item">
          <div
            className="echTooltip__item--backgroundColor"
            style={{ backgroundColor: 'transparent' }}
          >
            <div
              className="echTooltip__item--color"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="echTooltip__item--container">
            <span className="echTooltip__label">{latencyLabel}</span>
            <span className="echTooltip__value">
              {latencyFormatter(latency).formatted}
            </span>
          </div>
        </div>
        <div className="echTooltip__item">
          <div
            className="echTooltip__item--backgroundColor"
            style={{ backgroundColor: 'transparent' }}
          >
            <div
              className="echTooltip__item--color"
              style={{ backgroundColor: color }}
            />
          </div>
          <div className="echTooltip__item--container">
            <span className="echTooltip__label">{throughputLabel}</span>
            <span className="echTooltip__value">
              {asTransactionRate(throughput)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Tooltip for a multiple instances
 */
function MultipleInstanceCustomTooltip({
  latencyFormatter,
  values,
}: TooltipInfo & { latencyFormatter: TimeFormatter }) {
  const theme = useTheme();

  return (
    <>
      <div className="echTooltip__header">
        {i18n.translate(
          'xpack.apm.instancesLatencyDistributionChartTooltipInstancesTitle',
          {
            defaultMessage:
              '{instancesCount} {instancesCount, plural, one {instance} other {instances}}',
            values: { instancesCount: values.length },
          }
        )}
      </div>
      {values.map((value) => {
        const { color } = value;
        const datum = value.datum as unknown as MainStatsServiceInstanceItem;
        const { latency, serviceNodeName, throughput } = datum;
        return (
          <div className="echTooltip__list" key={serviceNodeName}>
            <div className="echTooltip__item">
              <div
                className="echTooltip__item--backgroundColor"
                style={{ backgroundColor: 'transparent' }}
              >
                <div
                  className="echTooltip__item--color"
                  style={{ backgroundColor: color }}
                />
              </div>
              <div className="echTooltip__item--container">
                <span className="echTooltip__label">
                  {getServiceNodeName(serviceNodeName)}
                </span>
              </div>
            </div>
            <div className="echTooltip__item">
              <div
                className="echTooltip__item--backgroundColor"
                style={{ backgroundColor: 'transparent' }}
              >
                <div
                  className="echTooltip__item--color"
                  style={{ backgroundColor: color }}
                />
              </div>
              <div
                className="echTooltip__item--container"
                style={{ paddingLeft: theme.eui.paddingSizes.s }}
              >
                <span className="echTooltip__label">{latencyLabel}</span>
                <span className="echTooltip__value">
                  {latencyFormatter(latency).formatted}
                </span>
              </div>
            </div>
            <div className="echTooltip__item">
              <div
                className="echTooltip__item--backgroundColor"
                style={{ backgroundColor: 'transparent' }}
              >
                <div
                  className="echTooltip__item--color"
                  style={{ backgroundColor: color }}
                />
              </div>
              <div
                className="echTooltip__item--container"
                style={{ paddingLeft: theme.eui.paddingSizes.s }}
              >
                <span className="echTooltip__label">{throughputLabel}</span>
                <span className="echTooltip__value">
                  {asTransactionRate(throughput)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Custom tooltip for instances latency distribution chart.
 *
 * The styling provided here recreates that in the Elastic Charts tooltip: https://github.com/elastic/elastic-charts/blob/58e6b5fbf77f4471d2a9a41c45a61f79ebd89b65/src/components/tooltip/tooltip.tsx
 *
 * We probably won't need to do all of this once https://github.com/elastic/elastic-charts/issues/615 is completed.
 */
export function CustomTooltip(
  props: TooltipInfo & { latencyFormatter: TimeFormatter }
) {
  const { values } = props;
  const theme = useTheme();

  return (
    <div className="echTooltip">
      {values.length > 1 ? (
        <MultipleInstanceCustomTooltip {...props} />
      ) : (
        <SingleInstanceCustomTooltip {...props} />
      )}
      <div style={{ padding: theme.eui.paddingSizes.xs }}>
        <EuiIcon type="filter" /> {clickToFilterDescription}
      </div>
    </div>
  );
}
