/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { CSSProperties, useMemo } from 'react';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { Action } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { ChartLoadError, LensWrapper, TooltipContent } from '.';
import { FormulaConfig, MetricLayerOptions } from '../../common/visualizations';
import { Layer, useLensAttributes } from '../../hooks/use_lens_attributes';
import { LensWrapperProps } from './lens_wrapper';

export type Props = Pick<TypedLensByValueInput, 'id' | 'title' | 'disableTriggers'> &
  Pick<
    LensWrapperProps,
    'dateRange' | 'filters' | 'query' | 'lastReloadRequestTime' | 'loading' | 'onBrushEnd'
  > & {
    dataView?: DataView;
    layers: Layer<MetricLayerOptions, FormulaConfig, 'data'>;
    toolTip: string;
    height?: number;
  };

const MIN_HEIGHT = 150;

export const LensMetricChart = ({
  id,
  dataView,
  dateRange,
  filters,
  layers,
  lastReloadRequestTime,
  toolTip,
  query,
  title,
  onBrushEnd,
  disableTriggers = false,
  height = MIN_HEIGHT,
  loading = false,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const { formula, attributes, getExtraActions, error } = useLensAttributes({
    dataView,
    title,
    layers,
    visualizationType: 'lnsMetric',
  });

  const isLoading = loading || !attributes;

  const extraActions: Action[] = useMemo(
    () =>
      getExtraActions({
        timeRange: dateRange,
        query,
        filters,
      }),
    [dateRange, filters, getExtraActions, query]
  );

  const sytle: CSSProperties = useMemo(() => ({ height }), [height]);

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      data-test-subj={id}
      css={css`
        position: relative;
        min-height: ${height}px;
        .echMetric {
          border-radius: ${euiTheme.border.radius.medium};
          pointer-events: none;
        }
      `}
    >
      {error ? (
        <ChartLoadError />
      ) : (
        <EuiToolTip
          delay="regular"
          content={<TooltipContent formula={formula} description={toolTip} />}
          anchorClassName="eui-fullWidth"
        >
          <LensWrapper
            id={id}
            attributes={attributes}
            dateRange={dateRange}
            disableTriggers={disableTriggers}
            extraActions={extraActions}
            filters={filters}
            lastReloadRequestTime={lastReloadRequestTime}
            loading={isLoading}
            style={sytle}
            query={query}
            onBrushEnd={onBrushEnd}
            hidePanelTitles
          />
        </EuiToolTip>
      )}
    </EuiPanel>
  );
};
