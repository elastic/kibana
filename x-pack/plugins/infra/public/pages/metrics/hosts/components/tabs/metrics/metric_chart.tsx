/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';
import { BrushTriggerEvent } from '@kbn/charts-plugin/public';
import { EuiIcon, EuiPanel, EuiProgress } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiI18n } from '@elastic/eui';
import { EuiLoadingChart } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import useCustomCompareEffect from 'react-use/lib/useCustomCompareEffect';
import { isEqual } from 'lodash';
import { useLensAttributes } from '../../../../../../hooks/use_lens_attributes';
import { useMetricsDataViewContext } from '../../../hooks/use_data_view';
import { useUnifiedSearchContext } from '../../../hooks/use_unified_search';
import { HostsLensLineChartFormulas } from '../../../../../../common/visualizations';
import { useHostsViewContext } from '../../../hooks/use_hosts_view';
import { createHostsFilter } from '../../../utils';
import { useHostsTableContext } from '../../../hooks/use_hosts_table';
import { LensWrapper } from '../../chart/lens_wrapper';

export interface MetricChartProps {
  title: string;
  type: HostsLensLineChartFormulas;
  breakdownSize: number;
  render?: boolean;
}

const MIN_HEIGHT = 300;

export const MetricChart = ({ title, type, breakdownSize }: MetricChartProps) => {
  const { euiTheme } = useEuiTheme();
  const { searchCriteria, onSubmit } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();
  const { baseRequest, loading } = useHostsViewContext();
  const { currentPage } = useHostsTableContext();
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [internalLastReloadRequestTime, setInternalLastReloadRequestTime] = useState(
    baseRequest.requestTs
  );
  const [internalSearchCriteria, setInternalSearchCriteria] = useState(searchCriteria);

  useCustomCompareEffect(
    () => {
      // prevents updates on requestTs and serchCriteria states from relaoding the chart
      // we want it to reload only once the table has finished loading
      if (!loading) {
        setInternalLastReloadRequestTime(baseRequest.requestTs);
        setInternalSearchCriteria(searchCriteria);
      }
    },
    [loading],
    (prevDeps, nextDeps) => isEqual(prevDeps, nextDeps)
  );

  const { attributes, getExtraActions, error } = useLensAttributes({
    type,
    dataView,
    options: {
      title,
      breakdownSize,
    },
    visualizationType: 'lineChart',
  });

  const hostsFilterQuery = useMemo(() => {
    return createHostsFilter(
      currentPage.map((p) => p.name),
      dataView
    );
  }, [currentPage, dataView]);

  const filters = [
    ...internalSearchCriteria.filters,
    ...internalSearchCriteria.panelFilters,
    ...[hostsFilterQuery],
  ];
  const extraActionOptions = getExtraActions({
    timeRange: internalSearchCriteria.dateRange,
    filters,
    query: internalSearchCriteria.query,
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
      style={{ minHeight: MIN_HEIGHT, position: 'relative' }}
      data-test-subj={`hostsView-metricChart-${type}`}
    >
      {error ? (
        <EuiFlexGroup
          style={{ minHeight: '100%', alignContent: 'center' }}
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
        <>
          {loading && (
            <EuiProgress
              size="xs"
              color="accent"
              position="absolute"
              style={{ zIndex: 1 }}
              css={css`
                top: ${loadedOnce ? euiTheme.size.l : 0};
              `}
            />
          )}

          {loading && !loadedOnce ? (
            <EuiFlexGroup style={{ height: '100%' }} justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingChart mono size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <LensWrapper
              id={`hostsViewsmetricsChart-${type}`}
              attributes={attributes}
              style={{ height: MIN_HEIGHT }}
              extraActions={extraActions}
              lastReloadRequestTime={internalLastReloadRequestTime}
              dateRange={internalSearchCriteria.dateRange}
              filters={filters}
              query={internalSearchCriteria.query}
              onBrushEnd={handleBrushEnd}
              onLoad={() => {
                if (loadedOnce) {
                  setLoadedOnce(true);
                }
              }}
            />
          )}
        </>
      )}
    </EuiPanel>
  );
};
