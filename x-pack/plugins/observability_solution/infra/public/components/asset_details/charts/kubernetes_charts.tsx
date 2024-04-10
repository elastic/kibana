/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { useKubernetesCharts } from '../hooks/use_metrics_charts';
import { useMetadataStateContext } from '../hooks/use_metadata_state';
import { Section } from '../components/section';
import { SectionTitle } from '../components/section_title';
import { HOST_METRIC_GROUP_TITLES } from '../translations';
import { INTEGRATIONS } from '../constants';
import { ChartsGrid } from '../charts_grid/charts_grid';
import { Chart } from './chart';

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
>(({ assetId, dataView, dateRange, onShowAll }, ref) => {
  const { charts } = useKubernetesCharts({
    dataViewId: dataView?.id,
  });
  const { metadata } = useMetadataStateContext();

  const shouldRender = useMemo(
    () => (metadata?.features ?? []).some((f) => f.name === INTEGRATIONS.kubernetes),
    [metadata?.features]
  );

  return shouldRender ? (
    <Section
      title={<SectionTitle title={HOST_METRIC_GROUP_TITLES.kubernetes} />}
      data-test-subj="infraAssetDetailsMetricsCollabsible"
      id="kubernetes"
      ref={ref}
      extraAction={
        onShowAll ? (
          <EuiButtonEmpty
            data-test-subj="infraAssetDetailsMetadataShowAllButton"
            onClick={() => onShowAll('kubernetes')}
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
  ) : null;
});
