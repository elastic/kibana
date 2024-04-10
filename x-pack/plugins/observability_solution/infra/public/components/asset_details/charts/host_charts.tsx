/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiText, EuiLink, EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { HOST_METRICS_DOC_HREF } from '../../../common/visualizations';
import { HOST_METRIC_GROUP_TITLES } from '../translations';
import { Section } from '../components/section';
import { ChartsGrid } from '../charts_grid/charts_grid';
import { Chart } from './chart';
import { type HostMetricTypes, useHostCharts } from '../hooks/use_metrics_charts';
import { TitleWithTooltip } from '../components/section_title';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  dataView?: DataView;
  overview?: boolean;
  metric: Exclude<HostMetricTypes, 'kpi'>;
  onShowAll?: (metric: string) => void;
}

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
                  id="xpack.infra.gettingStarted.cards.appSearch.title"
                  defaultMessage="See host-related {link} for more information"
                  values={{
                    link: (
                      <EuiLink
                        data-test-subj="hostsViewMetricsDocumentationLink"
                        href={`${HOST_METRICS_DOC_HREF}#key-metrics-${metric}`}
                        target="_blank"
                      >
                        {`${metric} metrics`}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            }
          />
        }
        data-test-subj="infraAssetDetailsMetricsCollabsible"
        id={metric}
        ref={ref}
        extraAction={
          onShowAll ? (
            <EuiButtonEmpty
              data-test-subj="infraAssetDetailsMetadataShowAllButton"
              onClick={() => onShowAll(metric)}
              size="xs"
              flush="both"
              iconSide="right"
              iconType="sortRight"
              key="metadata-link"
            >
              <FormattedMessage
                id="xpack.infra.assetDetails.metadataSummary.showAllMetadataButton"
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
