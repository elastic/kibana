import { EuiButtonEmpty, EuiLink, EuiText } from '@elastic/eui';
import { css, cx } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { HOST_METRICS_DOC_HREF } from '../../../common/visualizations';
import { ChartsGrid } from '../charts_grid/charts_grid';
import { Section } from '../components/section';
import { TitleWithTooltip } from '../components/section_title';
import { useHostCharts } from '../hooks/use_host_metrics_charts';
import { HOST_METRIC_GROUP_TITLES } from '../translations';
import { Chart } from './chart';
import { HostMetricTypes, MetricsChartsFields } from './types';

interface Props extends MetricsChartsFields {
  metric: Exclude<HostMetricTypes, 'kpi'>;
}

const FRAGMENT_BASE = 'key-metrics';

export const HostCharts = React.forwardRef<HTMLDivElement, Props>(
  ({ assetId, dataView, dateRange, metric, onShowAll, overview = false }, ref) => {
    const { charts } = useHostCharts({
      metric,
      dataViewId: dataView?.id,
      options: { overview },
    });

    return (
      <Section
        title={
          <TitleWithTooltip
            title={HOST_METRIC_GROUP_TITLES[metric]}
            tooltipContent={
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.infra.assetDetails.charts.host.toolTip"
                  defaultMessage="See host-related {link} for more information"
                  values={{
                    link: (
                      <EuiLink
                        data-test-subj="infraAssetDetailsViewHostMetricsDocumentationLink"
                        href={`${HOST_METRICS_DOC_HREF}#${FRAGMENT_BASE}-${metric}`}
                        target="_blank"
                        className={cx({
                          [css`
                            text-transform: lowercase;
                          `]: metric !== 'cpu',
                        })}
                      >
                        <FormattedMessage
                          id="xpack.infra.assetDetails.charts.host.toolTip.linkText"
                          defaultMessage="{metric} metrics"
                          values={{ metric: HOST_METRIC_GROUP_TITLES[metric] }}
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            }
          />
        }
        data-test-subj={`infraAssetDetailsHostChartsSection${metric}`}
        id={metric}
        ref={ref}
        extraAction={
          onShowAll ? (
            <EuiButtonEmpty
              data-test-subj="infraAssetDetailsHostChartsShowAllButton"
              onClick={() => onShowAll(metric)}
              size="xs"
              flush="both"
              iconSide="right"
              iconType="sortRight"
            >
              <FormattedMessage
                id="xpack.infra.assetDetails.charts.host.showAllButton"
                defaultMessage="Show all"
              />
            </EuiButtonEmpty>
          ) : null
        }
      >
        <ChartsGrid columns={2}>
          {charts.map((chart) => (
            <Chart
              key={chart.id}
              {...chart}
              assetId={assetId}
              dateRange={dateRange}
              queryField={findInventoryFields('host').id}
            />
          ))}
        </ChartsGrid>
      </Section>
    );
  }
);
