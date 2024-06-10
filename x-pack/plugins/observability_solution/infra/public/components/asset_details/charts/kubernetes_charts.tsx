/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css, cx } from '@emotion/css';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { useKubernetesCharts } from '../hooks/use_host_metrics_charts';
import { Section } from '../components/section';
import { SectionTitle, TitleWithTooltip } from '../components/section_title';
import { CONTAINER_METRIC_GROUP_TITLES, HOST_METRIC_GROUP_TITLES } from '../translations';
import { INTEGRATIONS } from '../constants';
import { ChartsGrid } from '../charts_grid/charts_grid';
import { Chart } from './chart';
import { useIntegrationCheck } from '../hooks/use_integration_check';
import { useK8sContainerPageViewMetricsCharts } from '../hooks/use_container_metrics_charts';
import { CONTAINER_METRICS_DOC_HREF } from '../../../common/visualizations/constants';
import { ContainerMetricTypes, MetricsChartsFields } from './types';

const FRAGMENT_BASE = 'key-metrics';

export const KubernetesNodeCharts = React.forwardRef<HTMLDivElement, MetricsChartsFields>(
  ({ assetId, dataView, dateRange, onShowAll, overview }, ref) => {
    const { charts } = useKubernetesCharts({
      dataViewId: dataView?.id,
      overview,
    });

    const hasIntegration = useIntegrationCheck({ dependsOn: INTEGRATIONS.kubernetesNode });

    if (!hasIntegration) {
      return null;
    }

    return (
      <Section
        title={<SectionTitle title={HOST_METRIC_GROUP_TITLES.kubernetes} />}
        data-test-subj="infraAssetDetailsKubernetesChartsSection"
        id="kubernetes"
        ref={ref}
        extraAction={
          onShowAll ? (
            <EuiButtonEmpty
              data-test-subj="infraAssetDetailsKubernetesChartsShowAllButton"
              onClick={() => onShowAll('kubernetes')}
              size="xs"
              flush="both"
              iconSide="right"
              iconType="sortRight"
            >
              <FormattedMessage
                id="xpack.infra.assetDetails.charts.kubernetes.showAllButton"
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
              assetId={assetId}
              dateRange={dateRange}
              lensAttributes={chart}
              queryField={findInventoryFields('host').id}
            />
          ))}
        </ChartsGrid>
      </Section>
    );
  }
);

export const KubernetesContainerCharts = React.forwardRef<
  HTMLDivElement,
  MetricsChartsFields & { metric: ContainerMetricTypes }
>(({ assetId, dataView, dateRange, metric }, ref) => {
  const { charts } = useK8sContainerPageViewMetricsCharts({
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
                id="xpack.infra.assetDetails.charts.container.k8s.toolTip"
                defaultMessage="See container-related {link} for more information"
                values={{
                  link: (
                    // confirm the link, there's not documentation for k8s container metrics
                    <EuiLink
                      data-test-subj="infraAssetDetailsViewContainerK8sMetricsDocumentationLink"
                      href={`${CONTAINER_METRICS_DOC_HREF}#${FRAGMENT_BASE}-${metric}`}
                      target="_blank"
                      className={cx({
                        [css`
                          text-transform: lowercase;
                        `]: metric !== 'cpu',
                      })}
                    >
                      <FormattedMessage
                        id="xpack.infra.assetDetails.charts.container.k8s.toolTip.linkText"
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
      data-test-subj="infraAssetDetailsK8ContainerChartsSection"
      id="k8sContainerCharts"
      ref={ref}
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
});
