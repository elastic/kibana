/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { CSSProperties, useMemo } from 'react';
import { EuiPanel, EuiToolTip, type EuiPanelProps } from '@elastic/eui';
import { Action } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { useLensAttributes, type UseLensAttributesParams } from '../../hooks/use_lens_attributes';
import type { BaseChartProps } from './types';
import type { TooltipContentProps } from './metric_explanation/tooltip_content';
import { LensWrapper } from './lens_wrapper';
import { ChartLoadError } from './chart_load_error';

const MIN_HEIGHT = 300;

export type LensChartProps = UseLensAttributesParams &
  BaseChartProps &
  Pick<EuiPanelProps, 'borderRadius'> & {
    toolTip?: React.ReactElement<TooltipContentProps>;
  };

export const LensChart = ({
  id,
  borderRadius,
  dateRange,
  filters,
  hidePanelTitles,
  lastReloadRequestTime,
  query,
  onBrushEnd,
  overrides,
  toolTip,
  disableTriggers = false,
  height = MIN_HEIGHT,
  loading = false,
  ...lensAttributesParams
}: LensChartProps) => {
  const { formula, attributes, getExtraActions, error } = useLensAttributes({
    ...lensAttributesParams,
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

  const Lens = (
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
      overrides={overrides}
      onBrushEnd={onBrushEnd}
      hidePanelTitles={hidePanelTitles}
    />
  );

  const getContent = () => {
    if (!toolTip) {
      return Lens;
    }

    return (
      <EuiToolTip
        delay="regular"
        content={React.cloneElement(toolTip, {
          formula,
        })}
        anchorClassName="eui-fullWidth"
      >
        {/* EuiToolTip forwards some event handlers to the child component. 
        Wrapping Lens inside a div prevents that from causing unnecessary re-renders  */}
        <div>{Lens}</div>
      </EuiToolTip>
    );
  };

  return (
    <EuiPanel
      hasBorder={!!borderRadius}
      borderRadius={borderRadius}
      hasShadow={false}
      paddingSize={error ? 'm' : 'none'}
      data-test-subj={id}
      css={css`
        position: relative;
        min-height: ${height}px;
      `}
    >
      {error ? <ChartLoadError /> : getContent()}
    </EuiPanel>
  );
};
