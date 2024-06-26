/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css, cx } from '@emotion/css';
import { EuiText, EuiLink, EuiButtonEmpty } from '@elastic/eui';
import { useDockerContainerPageViewMetricsCharts } from '../hooks/use_container_metrics_charts';
import { Section } from '../components/section';
import { ChartsGrid } from '../charts_grid/charts_grid';
import { Chart } from './chart';
import { TitleWithTooltip } from '../components/section_title';
import { CONTAINER_METRIC_GROUP_TITLES } from '../translations';
import { CONTAINER_METRICS_DOC_HREF } from '../../../common/visualizations/constants';
import { MetricsChartsFields, ContainerMetricTypes } from './types';

interface Props extends MetricsChartsFields {
  metric: ContainerMetricTypes;
}

const FRAGMENT_BASE = 'key-metrics';

export const DockerCharts = React.forwardRef<HTMLDivElement, Props>(
  ({ assetId, dataView, dateRange, metric, onShowAll }, ref) => {
    const { charts } = useDockerContainerPageViewMetricsCharts({
      metric,
      metricsDataViewId: dataView?.id,
    });
    return (
      <Section
        title={
          <TitleWithTooltip
            title={CONTAINER_METRIC_GROUP_TITLES[metric]}
            tooltipContent={
              <EuiText size="xs">
                <FormattedMessage
                  id="xpack.infra.assetDetails.charts.container.toolTip"
                  defaultMessage="See container-related {link} for more information"
                  values={{
                    link: (
                      <EuiLink
                        data-test-subj="infraAssetDetailsViewContainerMetricsDocumentationLink"
                        href={`${CONTAINER_METRICS_DOC_HREF}#${FRAGMENT_BASE}-${metric}`}
                        target="_blank"
                        className={cx({
                          [css`
                            text-transform: lowercase;
                          `]: metric !== 'cpu',
                        })}
                      >
                        <FormattedMessage
                          id="xpack.infra.assetDetails.charts.container.toolTip.linkText"
                          defaultMessage="{metric} metrics"
                          values={{ metric: CONTAINER_METRIC_GROUP_TITLES[metric] }}
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            }
          />
        }
        data-test-subj={`infraAssetDetailsDockerChartsSection${metric}`}
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
              id={chart.id}
              key={chart.id}
              lensAttributes={chart}
              assetId={assetId}
              dateRange={dateRange}
              queryField={findInventoryFields('container').id}
            />
          ))}
        </ChartsGrid>
      </Section>
    );
  }
);
