/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiI18n,
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { useMetricsDataViewContext } from '../../../../pages/metrics/hosts/hooks/use_data_view';
import { useLensAttributes } from '../../../../hooks/use_lens_attributes';
import { useUnifiedSearchContext } from '../../../../pages/metrics/hosts/hooks/use_unified_search';
import type { HostsLensMetricChartFormulas } from '../../../../common/visualizations';
import { LensWrapper } from '../../../../pages/metrics/hosts/components/chart/lens_wrapper';
import { buildCombinedHostsFilter } from '../../../../pages/metrics/hosts/utils';
import { TooltipContent } from '../../../../pages/metrics/hosts/components/metric_explanation/tooltip_content';

export interface KPIChartProps {
  title: string;
  subtitle?: string;
  trendLine?: boolean;
  backgroundColor: string;
  type: HostsLensMetricChartFormulas;
  decimals?: number;
  toolTip: string;
}

const MIN_HEIGHT = 150;

export const Tile = ({
  title,
  type,
  backgroundColor,
  toolTip,
  decimals = 1,
  trendLine = false,
  nodeName,
}: KPIChartProps & { nodeName: string }) => {
  const { searchCriteria } = useUnifiedSearchContext();
  const { dataView } = useMetricsDataViewContext();

  const getSubtitle = () =>
    i18n.translate('xpack.infra.hostsViewPage.metricTrend.subtitle.average', {
      defaultMessage: 'Average',
    });

  const { formula, attributes, getExtraActions, error } = useLensAttributes({
    type,
    dataView,
    options: {
      backgroundColor,
      decimals,
      subtitle: getSubtitle(),
      showTrendLine: trendLine,
      showTitle: false,
      title,
    },
    visualizationType: 'metricChart',
  });

  const filters = useMemo(() => {
    return [
      buildCombinedHostsFilter({
        field: 'host.name',
        values: [nodeName],
        dataView,
      }),
    ];
  }, [dataView, nodeName]);

  const extraActionOptions = getExtraActions({
    timeRange: searchCriteria.dateRange,
    filters,
  });

  const loading = !attributes;

  return (
    <EuiPanelStyled
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      style={{ minHeight: MIN_HEIGHT }}
      data-test-subj={`hostsViewKPI-${type}`}
    >
      {error ? (
        <EuiFlexGroup
          style={{ height: MIN_HEIGHT, alignContent: 'center' }}
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
        <EuiToolTip
          delay="regular"
          content={<TooltipContent formula={formula} description={toolTip} />}
          anchorClassName="eui-fullWidth"
        >
          <LensWrapper
            id={`hostsViewKPIGrid${type}Tile`}
            attributes={attributes}
            style={{ height: MIN_HEIGHT }}
            extraActions={[extraActionOptions.openInLens]}
            dateRange={searchCriteria.dateRange}
            filters={filters}
            loading={loading}
          />
        </EuiToolTip>
      )}
    </EuiPanelStyled>
  );
};

const EuiPanelStyled = styled(EuiPanel)`
  .echMetric {
    border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
    pointer-events: none;
  }
`;
