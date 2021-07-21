/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo } from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { VisualizationToolbarProps } from '../types';
import { LegendSettingsPopover, ToolbarPopover } from '../shared_components';
import { HeatmapVisualizationState } from './types';

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
      <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" responsive={false}>
            <VisualOptionsPopover
              valueLabels={state.gridConfig.isCellLabelVisible}
              onValueLabelChange={(value) =>
                setState({
                  ...state,
                  gridConfig: { ...state.gridConfig, isCellLabelVisible: value },
                })
              }
            />
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
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

const valueLabelsOptions: Array<{
  id: string;
  value: boolean;
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: `value_labels_hide`,
    value: false,
    label: i18n.translate('xpack.lens.heatmapChart.valueLabelsVisibility.auto', {
      defaultMessage: 'Hide',
    }),
    'data-test-subj': 'lnsXY_valueLabels_hide',
  },
  {
    id: `value_labels_show`,
    value: true,
    label: i18n.translate('xpack.lens.heatmapChart.valueLabelsVisibility.inside', {
      defaultMessage: 'Show',
    }),
    'data-test-subj': 'lnsXY_valueLabels_inside',
  },
];

interface VisualOptionsProps {
  valueLabels?: boolean;
  onValueLabelChange: (newMode: boolean) => void;
}

const VisualOptionsPopover: FC<VisualOptionsProps> = ({
  onValueLabelChange,
  valueLabels = 'hide',
}) => {
  return (
    <ToolbarPopover
      title={i18n.translate('xpack.lens.shared.visualOptions', {
        defaultMessage: 'Visual options',
      })}
      type="visualOptions"
      groupPosition="left"
      buttonDataTestSubj="lnsVisualOptionsButton"
    >
      <EuiFormRow
        display="columnCompressed"
        label={
          <span>
            {i18n.translate('xpack.lens.heatmapChart.chartValueLabelVisibilityLabel', {
              defaultMessage: 'Labels',
            })}
          </span>
        }
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.heatmapChart.chartValueLabelVisibilityLabel', {
            defaultMessage: 'Labels',
          })}
          data-test-subj="lnsValueLabelsDisplay"
          name="valueLabelsDisplay"
          buttonSize="compressed"
          options={valueLabelsOptions}
          idSelected={valueLabelsOptions.find(({ value }) => value === valueLabels)!.id}
          onChange={(modeId) => {
            const newMode = valueLabelsOptions.find(({ id }) => id === modeId)!.value;
            onValueLabelChange(newMode);
          }}
        />
      </EuiFormRow>
    </ToolbarPopover>
  );
};
