/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State, XYState, XYReferenceLineLayerConfig, YConfig } from '../types';
import { FormatFactory } from '../../../common';
import { FillStyle } from '../../../../../../src/plugins/chart_expressions/expression_xy/common';

import { ColorPicker } from './color_picker';
import { updateLayer } from '.';
import { useDebouncedValue } from '../../shared_components';
import { idPrefix } from './dimension_editor';
import { isHorizontalChart } from '../state_helpers';
import { MarkerDecorationSettings } from './shared/marker_decoration_settings';
import { LineStyleSettings } from './shared/line_style_settings';

export const ReferenceLinePanel = (
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) => {
  const { state, setState, layerId, accessor } = props;

  const isHorizontal = isHorizontalChart(state.layers);
  const index = state.layers.findIndex((l) => l.layerId === layerId);

  const { inputValue: localState, handleInputChange: setLocalState } = useDebouncedValue<XYState>({
    value: state,
    onChange: setState,
  });

  const localLayer = localState.layers.find(
    (l) => l.layerId === layerId
  ) as XYReferenceLineLayerConfig;
  const localConfig = localLayer?.yConfig?.find(
    (yAxisConfig) => yAxisConfig.forAccessor === accessor
  );

  const setConfig = useCallback(
    (yConfig: Partial<YConfig> | undefined) => {
      if (yConfig == null) {
        return;
      }
      const newYConfigs = [...(localLayer.yConfig || [])];
      const existingIndex = newYConfigs.findIndex(
        (yAxisConfig) => yAxisConfig.forAccessor === accessor
      );
      if (existingIndex !== -1) {
        newYConfigs[existingIndex] = { ...newYConfigs[existingIndex], ...yConfig };
      } else {
        newYConfigs.push({
          forAccessor: accessor,
          ...yConfig,
        });
      }
      setLocalState(updateLayer(localState, { ...localLayer, yConfig: newYConfigs }, index));
    },
    [accessor, index, localState, localLayer, setLocalState]
  );

  return (
    <>
      {' '}
      <MarkerDecorationSettings
        isHorizontal={isHorizontal}
        setConfig={setConfig}
        currentConfig={localConfig}
      />
      <LineStyleSettings
        isHorizontal={isHorizontal}
        setConfig={setConfig}
        currentConfig={localConfig}
      />
      <FillSetting isHorizontal={isHorizontal} setConfig={setConfig} currentConfig={localConfig} />
      <ColorPicker
        {...props}
        setConfig={setConfig}
        disableHelpTooltip
        label={i18n.translate('xpack.lens.xyChart.lineColor.label', {
          defaultMessage: 'Color',
        })}
      />
    </>
  );
};

interface LabelConfigurationOptions {
  isHorizontal: boolean;
  axisMode: YConfig['axisMode'];
}

function getFillPositionOptions({ isHorizontal, axisMode }: LabelConfigurationOptions) {
  const aboveLabel = i18n.translate('xpack.lens.xyChart.fill.above', {
    defaultMessage: 'Above',
  });
  const belowLabel = i18n.translate('xpack.lens.xyChart.fill.below', {
    defaultMessage: 'Below',
  });
  const beforeLabel = i18n.translate('xpack.lens.xyChart.fill.before', {
    defaultMessage: 'Before',
  });
  const afterLabel = i18n.translate('xpack.lens.xyChart.fill.after', {
    defaultMessage: 'After',
  });

  const aboveOptionLabel = axisMode !== 'bottom' && !isHorizontal ? aboveLabel : afterLabel;
  const belowOptionLabel = axisMode !== 'bottom' && !isHorizontal ? belowLabel : beforeLabel;

  return [
    {
      id: `${idPrefix}none`,
      label: i18n.translate('xpack.lens.xyChart.fill.none', {
        defaultMessage: 'None',
      }),
      'data-test-subj': 'lnsXY_fill_none',
    },
    {
      id: `${idPrefix}above`,
      label: aboveOptionLabel,
      'data-test-subj': 'lnsXY_fill_above',
    },
    {
      id: `${idPrefix}below`,
      label: belowOptionLabel,
      'data-test-subj': 'lnsXY_fill_below',
    },
  ];
}

export const FillSetting = ({
  currentConfig,
  setConfig,
  isHorizontal,
}: {
  currentConfig?: YConfig;
  setConfig: (yConfig: Partial<YConfig> | undefined) => void;
  isHorizontal: boolean;
}) => {
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.xyChart.fill.label', {
        defaultMessage: 'Fill',
      })}
    >
      <EuiButtonGroup
        isFullWidth
        legend={i18n.translate('xpack.lens.xyChart.fill.label', {
          defaultMessage: 'Fill',
        })}
        data-test-subj="lnsXY_fill"
        name="fill"
        buttonSize="compressed"
        options={getFillPositionOptions({ isHorizontal, axisMode: currentConfig?.axisMode })}
        idSelected={`${idPrefix}${currentConfig?.fill || 'none'}`}
        onChange={(id) => {
          const newMode = id.replace(idPrefix, '') as FillStyle;
          setConfig({ fill: newMode });
        }}
      />
    </EuiFormRow>
  );
};
