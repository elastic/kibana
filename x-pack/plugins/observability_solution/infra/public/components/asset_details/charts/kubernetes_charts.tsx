/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { useKubernetesCharts } from '../hooks/use_metrics_charts';
import { Section } from '../components/section';
import { SectionTitle } from '../components/section_title';
import { HOST_METRIC_GROUP_TITLES } from '../translations';
import { INTEGRATIONS } from '../constants';
import { ChartsGrid } from '../charts_grid/charts_grid';
import { Chart } from './chart';
import { useIntegrationCheck } from '../hooks/use_integration_check';

interface Props {
  assetId: string;
  dateRange: TimeRange;
  dataView?: DataView;
  overview?: boolean;
  onShowAll?: (metric: string) => void;
}

export const KubernetesCharts = React.forwardRef<
  HTMLDivElement,
  Props & { onShowAll?: (metric: string) => void }
>(({ assetId, dataView, dateRange, onShowAll, overview }, ref) => {
  const { charts } = useKubernetesCharts({
    dataViewId: dataView?.id,
    options: { overview },
  });

  const hasIntegration = useIntegrationCheck({ dependsOn: INTEGRATIONS.kubernetes });

  return hasIntegration ? (
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
            key={chart.id}
            {...chart}
            assetId={assetId}
            dateRange={dateRange}
            queryField={findInventoryFields('host').id}
          />
        ))}
      </ChartsGrid>
    </Section>
  ) : null;
});
