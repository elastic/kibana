/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiPanel } from '@elastic/eui';
import { Action } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { ChartLoadError, LensWrapper } from '.';
import { FormulaConfig, XYLayerOptions } from '../../common/visualizations';
import { Layer, useLensAttributes } from '../../hooks/use_lens_attributes';
import { LensWrapperProps } from './lens_wrapper';

export type Props = Pick<TypedLensByValueInput, 'id' | 'title' | 'overrides' | 'disableTriggers'> &
  Pick<
    LensWrapperProps,
    'dateRange' | 'filters' | 'query' | 'lastReloadRequestTime' | 'loading' | 'onBrushEnd'
  > & {
    dataView?: DataView;
    layers: Array<Layer<XYLayerOptions, FormulaConfig[]>>;
  };

const MIN_HEIGHT = 300;

export const LensXYChart = ({
  id,
  dataView,
  dateRange,
  filters,
  layers,
  lastReloadRequestTime,
  query,
  title,
  onBrushEnd,
  disableTriggers = false,
  loading = false,
}: Props) => {
  const { attributes, getExtraActions, error } = useLensAttributes({
    dataView,
    title,
    layers,
    visualizationType: 'lnsXY',
  });

  const isLoading = loading || !attributes;

  const extraActions: Action[] = getExtraActions({
    timeRange: dateRange,
    query,
    filters,
  });

  return (
    <EuiPanel
      borderRadius="m"
      hasShadow={false}
      hasBorder
      paddingSize={error ? 'm' : 'none'}
      data-test-subj={id}
      css={css`
        position: relative;
        min-height: ${MIN_HEIGHT}px;
      `}
    >
      {error ? (
        <ChartLoadError />
      ) : (
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
          disableTriggers={disableTriggers}
        />
      )}
    </EuiPanel>
  );
};
