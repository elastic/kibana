/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { VisualizationToolbarProps } from '../types';
import { LegendSettingsPopover } from '../shared_components';
import type { HeatmapVisualizationState } from './types';

const legendOptions: Array<{ id: string; value: 'auto' | 'show' | 'hide'; label: string }> = [
  {
    id: `heatmap_legend_show`,
    value: 'show',
    label: i18n.translate('xpack.lens.heatmapChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: `heatmap_legend_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.heatmapChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

export const HeatmapToolbar = memo(
  (props: VisualizationToolbarProps<HeatmapVisualizationState>) => {
    const { state, setState } = props;

    const legendMode = state.legend.isVisible ? 'show' : 'hide';

    return (
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" responsive={false}>
            <LegendSettingsPopover
              groupPosition={'none'}
              legendOptions={legendOptions}
              mode={legendMode}
              onDisplayChange={(optionId) => {
                const newMode = legendOptions.find(({ id }) => id === optionId)!.value;
                if (newMode === 'show') {
                  setState({
                    ...state,
                    legend: { ...state.legend, isVisible: true },
                  });
                } else if (newMode === 'hide') {
                  setState({
                    ...state,
                    legend: { ...state.legend, isVisible: false },
                  });
                }
              }}
              position={state?.legend.position}
              onPositionChange={(id) => {
                setState({
                  ...state,
                  legend: { ...state.legend, position: id as Position },
                });
              }}
              maxLines={state?.legend.maxLines}
              onMaxLinesChange={(val) => {
                setState({
                  ...state,
                  legend: { ...state.legend, maxLines: val },
                });
              }}
              shouldTruncate={state?.legend.shouldTruncate ?? true}
              onTruncateLegendChange={() => {
                const current = state.legend.shouldTruncate ?? true;
                setState({
                  ...state,
                  legend: { ...state.legend, shouldTruncate: !current },
                });
              }}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
