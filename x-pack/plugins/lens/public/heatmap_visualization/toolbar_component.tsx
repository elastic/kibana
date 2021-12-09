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
import { LegendSettingsPopover, ToolbarPopover, ValueLabelsSettings } from '../shared_components';
import type { HeatmapVisualizationState } from './types';
import { getDefaultVisualValuesForLayer } from '../shared_components/datasource_default_values';

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
    const { state, setState, frame } = props;

    const legendMode = state.legend.isVisible ? 'show' : 'hide';
    const defaultTruncationValue = getDefaultVisualValuesForLayer(
      state,
      frame.datasourceLayers
    ).truncateText;

    return (
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" responsive={false}>
            <ToolbarPopover
              title={i18n.translate('xpack.lens.shared.curveLabel', {
                defaultMessage: 'Visual options',
              })}
              type="visualOptions"
              groupPosition="left"
              buttonDataTestSubj="lnsVisualOptionsButton"
            >
              <ValueLabelsSettings
                valueLabels={state?.gridConfig.isCellLabelVisible ? 'inside' : 'hide'}
                onValueLabelChange={(newMode) => {
                  setState({
                    ...state,
                    gridConfig: { ...state.gridConfig, isCellLabelVisible: newMode === 'inside' },
                  });
                }}
              />
            </ToolbarPopover>
            <LegendSettingsPopover
              groupPosition={'right'}
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
              shouldTruncate={state?.legend.shouldTruncate ?? defaultTruncationValue}
              onTruncateLegendChange={() => {
                const current = state.legend.shouldTruncate ?? defaultTruncationValue;
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
