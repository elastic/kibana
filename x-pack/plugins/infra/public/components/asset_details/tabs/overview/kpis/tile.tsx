/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import type { KPIChartProps } from '../../../../../common/visualizations/lens/dashboards/host/kpi_grid_config';
import { useLensAttributes } from '../../../../../hooks/use_lens_attributes';
import { LensWrapper } from '../../../../../common/visualizations/lens/lens_wrapper';
import { buildCombinedHostsFilter } from '../../../../../utils/filters/build';
import { TooltipContent } from '../../../../../common/visualizations/metric_explanation/tooltip_content';

const MIN_HEIGHT = 150;

export interface TileProps {
  timeRange: TimeRange;
  dataView?: DataView;
  nodeName: string;
}

export const Tile = ({
  id,
  layers,
  title,
  toolTip,
  dataView,
  nodeName,
  timeRange,
}: KPIChartProps & TileProps) => {
  const getSubtitle = () =>
    i18n.translate('xpack.infra.assetDetailsEmbeddable.overview.metricTrend.subtitle.average', {
      defaultMessage: 'Average',
    });

  const { formula, attributes, getExtraActions, error } = useLensAttributes({
    dataView,
    title,
    layers: { ...layers, options: { ...layers.options, subtitle: getSubtitle() } },
    visualizationType: 'lnsMetric',
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

  const extraActions: Action[] = useMemo(
    () =>
      getExtraActions({
        timeRange,
        filters,
      }),
    [filters, getExtraActions, timeRange]
  );

  const loading = !attributes;

  return (
    <EuiPanelStyled
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      style={{ minHeight: MIN_HEIGHT }}
      data-test-subj={`assetDetailsKPI-${id}`}
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
              <FormattedMessage
                id="xpack.infra.assetDetailsEmbeddable.overview.errorOnLoadingLensDependencies"
                defaultMessage="There was an error trying to load Lens Plugin."
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
            id={`assetDetailsKPIGrid${id}Tile`}
            attributes={attributes}
            style={{ height: MIN_HEIGHT }}
            extraActions={extraActions}
            dateRange={timeRange}
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
