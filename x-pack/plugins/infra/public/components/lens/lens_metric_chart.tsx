/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { Action } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { ChartLoadError, LensWrapper, TooltipContent } from '.';
import { FormulaConfig, MetricLayerOptions } from '../../common/visualizations';
import { Layer, useLensAttributes } from '../../hooks/use_lens_attributes';
import { LensWrapperProps } from './lens_wrapper';

export type Props = Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides'> &
  Pick<
    LensWrapperProps,
    'dateRange' | 'filters' | 'query' | 'lastReloadRequestTime' | 'loading' | 'onBrushEnd'
  > & {
    dataView?: DataView;
    layers: Layer<MetricLayerOptions, FormulaConfig, 'data'>;
    toolTip: string;
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

  const extraActions: Action[] = getExtraActions({
    timeRange: dateRange,
    query,
    filters,
  });

  return (
    <EuiPanel
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      data-test-subj={id}
      css={css`
        position: relative;
        min-height: ${MIN_HEIGHT}px;
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
            style={{ height: MIN_HEIGHT }}
            extraActions={extraActions}
            lastReloadRequestTime={lastReloadRequestTime}
            dateRange={dateRange}
            filters={filters}
            query={query}
            onBrushEnd={onBrushEnd}
            loading={isLoading}
            hidePanelTitles
          />
        </EuiToolTip>
      )}
    </EuiPanel>
  );
};
