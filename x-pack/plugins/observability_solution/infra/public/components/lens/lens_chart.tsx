/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiPanel, EuiToolTip, type EuiPanelProps } from '@elastic/eui';
import { Action } from '@kbn/ui-actions-plugin/public';
import { css } from '@emotion/react';
import { useLensAttributes, type UseLensAttributesParams } from '../../hooks/use_lens_attributes';
import type { BaseChartProps } from './types';
import type { TooltipContentProps } from './metric_explanation/tooltip_content';
import { LensWrapper } from './lens_wrapper';
import { ChartLoadError } from './chart_load_error';

const MIN_HEIGHT = 300;

export type LensChartProps = BaseChartProps &
  Pick<EuiPanelProps, 'borderRadius'> & {
    toolTip?: React.ReactElement<TooltipContentProps>;
    searchSessionId?: string;
    description?: string;
  } & {
    lensAttributes: UseLensAttributesParams;
  };

export const LensChart = React.memo(
  ({
    id,
    borderRadius,
    dateRange,
    filters,
    hidePanelTitles,
    query,
    onBrushEnd,
    onFilter,
    overrides,
    toolTip,
    searchSessionId,
    disableTriggers = false,
    height = MIN_HEIGHT,
    loading = false,
    lensAttributes,
  }: LensChartProps) => {
    const { formula, attributes, getExtraActions, error } = useLensAttributes(lensAttributes);

    const isLoading = loading || !attributes;

    const extraActions: Action[] = getExtraActions({
      timeRange: dateRange,
      query,
      filters,
      searchSessionId,
    });

    const lens = (
      <LensWrapper
        id={id}
        attributes={attributes}
        dateRange={dateRange}
        disableTriggers={disableTriggers}
        extraActions={extraActions}
        filters={filters}
        hidePanelTitles={hidePanelTitles}
        loading={isLoading}
        style={{ height }}
        query={query}
        overrides={overrides}
        onBrushEnd={onBrushEnd}
        searchSessionId={searchSessionId}
        onFilter={onFilter}
      />
    );
    const content = !toolTip ? (
      lens
    ) : (
      <EuiToolTip
        delay="regular"
        content={React.cloneElement(toolTip, {
          formula,
        })}
        anchorClassName="eui-fullWidth"
      >
        {/* EuiToolTip forwards some event handlers to the child component.
        Wrapping Lens inside a div prevents that from causing unnecessary re-renders  */}
        <div>{lens}</div>
      </EuiToolTip>
    );

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
          .embPanel-isLoading {
            min-height: ${height}px;
          }
        `}
      >
        {error ? <ChartLoadError error={error} /> : content}
      </EuiPanel>
    );
  }
);
