/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { EuiIcon, EuiPanel } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiI18n } from '@elastic/eui';
import { useLensAttributes } from '../../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { HostsLensLineChartFormulas } from '../../../../../../common/visualizations';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { LensWrapper } from '../../chart/lens_wrapper';

export interface MetricChartProps {
  title: string;
  type: HostsLensLineChartFormulas;
  breakdownSize: number;
  render?: boolean;
}

const MIN_HEIGHT = 300;

export const MetricChart = ({ title, type, breakdownSize }: MetricChartProps) => {
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { baseRequest } = useHostsViewContext();

  const { attributes, getExtraActions, error } = useLensAttributes({
    type,
    dataView,
    options: {
      title,
      breakdownSize,
    },
    visualizationType: 'lineChart',
  });

  const filters = [...searchCriteria.filters, ...searchCriteria.panelFilters];
  const extraActionOptions = getExtraActions({
    timeRange: searchCriteria.dateRange,
    filters,
    query: searchCriteria.query,
  });

  const extraActions: Action[] = [extraActionOptions.openInLens];

  const handleBrushEnd = ({ range }: BrushTriggerEvent['data']) => {
    const [min, max] = range;
    onSubmit({
      dateRange: {
        from: new Date(min).toISOString(),
        to: new Date(max).toISOString(),
        mode: 'absolute',
      },
    });
  };

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      hasBorder
      paddingSize={error ? 'm' : 'none'}
      style={{ minHeight: MIN_HEIGHT }}
      data-test-subj={`hostsView-metricChart-${type}`}
    >
      {error ? (
        <EuiFlexGroup
          style={{ minHeight: MIN_HEIGHT, alignContent: 'center' }}
          gutterSize="xs"
          justifyContent="center"
          alignItems="center"
          direction="column"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="warning" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" textAlign="center">
              <EuiI18n
                token="'xpack.infra.hostsViewPage.errorOnLoadingLensDependencies'"
                default="There was an error trying to load Lens Plugin."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <LensWrapper
          id={`hostsViewsmetricsChart-${type}`}
          attributes={attributes}
          style={{ height: MIN_HEIGHT }}
          extraActions={extraActions}
          lastReloadRequestTime={baseRequest.requestTs}
          dateRange={searchCriteria.dateRange}
          filters={filters}
          query={searchCriteria.query}
          onBrushEnd={handleBrushEnd}
        />
      )}
    </EuiPanel>
  );
};
