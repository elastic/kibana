/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './xy_config_panel.scss';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiComboBox, EuiFormRow, EuiIcon, EuiRange } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State } from '../types';
import { FormatFactory } from '../../../common';
import { YConfig } from '../../../common/expressions';
import { LineStyle, FillStyle } from '../../../common/expressions/xy_chart';

import { ColorPicker } from './color_picker';
import { updateLayer, idPrefix } from '.';
import { useDebouncedValue } from '../../shared_components';

const icons = [
  { value: 'none', label: 'None' },
  { value: 'asterisk', label: 'Asterisk' },
  { value: 'bell', label: 'Bell' },
  { value: 'bolt', label: 'Bolt' },
  { value: 'bug', label: 'Bug' },
  { value: 'editorComment', label: 'Comment' },
  { value: 'alert', label: 'Alert' },
  { value: 'flag', label: 'Flag' },
  { value: 'tag', label: 'Tag' },
];

const IconView = (props: { value?: string; label: string }) => {
  if (!props.value) return null;
  return (
    <span>
      <EuiIcon type={props.value} />
      {` ${props.label}`}
    </span>
  );
};

const IconSelect = ({
  value,
  onChange,
}: {
  value?: string;
  onChange: (newIcon: string) => void;
}) => {
  const selectedIcon = icons.find((option) => value === option.value) || icons[0];

  return (
    <EuiComboBox
      isClearable={false}
      options={icons}
      selectedOptions={[selectedIcon]}
      onChange={(selection) => {
        onChange(selection[0].value!);
      }}
      singleSelection={{ asPlainText: true }}
      renderOption={IconView}
      compressed
    />
  );
};

export const ThresholdPanel = (
  props: VisualizationDimensionEditorProps<State> & {
    formatFactory: FormatFactory;
    paletteService: PaletteRegistry;
  }
) => {
  const { state, setState, layerId, accessor } = props;
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];

  const setYConfig = (yConfig: Partial<YConfig>) => {
    const newYConfigs = [...(layer.yConfig || [])];
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
    setState(updateLayer(state, { ...layer, yConfig: newYConfigs }, index));
  };

  const currentYConfig = layer.yConfig?.find((yConfig) => yConfig.forAccessor === accessor);

  return (
    <>
      <ColorPicker {...props} />
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.lineStyle.label', {
          defaultMessage: 'Line style',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.lineStyle.label', {
            defaultMessage: 'Line style',
          })}
          data-test-subj="lnsXY_line_style"
          name="lineStyle"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}solid`,
              label: i18n.translate('xpack.lens.xyChart.lineStyle.solid', {
                defaultMessage: 'Solid',
              }),
              'data-test-subj': 'lnsXY_line_style_solid',
            },
            {
              id: `${idPrefix}dashed`,
              label: i18n.translate('xpack.lens.xyChart.lineStyle.dashed', {
                defaultMessage: 'Dashed',
              }),
              'data-test-subj': 'lnsXY_line_style_dashed',
            },
            {
              id: `${idPrefix}dotted`,
              label: i18n.translate('xpack.lens.xyChart.lineStyle.dotted', {
                defaultMessage: 'Dotted',
              }),
              'data-test-subj': 'lnsXY_line_style_dotted',
            },
          ]}
          idSelected={`${idPrefix}${currentYConfig?.lineStyle || 'solid'}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as LineStyle;
            setYConfig({ lineStyle: newMode });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.lineThickness.label', {
          defaultMessage: 'Line thickness',
        })}
      >
        <LineThicknessSlider
          value={currentYConfig?.lineWidth || 1}
          onChange={(value) => {
            // TODO: fix number validation
            setYConfig({ lineWidth: value });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.fillThreshold.label', {
          defaultMessage: 'Fill',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.xyChart.fillThreshold.label', {
            defaultMessage: 'Fill',
          })}
          data-test-subj="lnsXY_fill_threshold"
          name="fill"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}none`,
              label: i18n.translate('xpack.lens.xyChart.fillThreshold.none', {
                defaultMessage: 'None',
              }),
              'data-test-subj': 'lnsXY_fill_none',
            },
            {
              id: `${idPrefix}above`,
              label: i18n.translate('xpack.lens.xyChart.fillThreshold.above', {
                defaultMessage: 'Above',
              }),
              'data-test-subj': 'lnsXY_fill_above',
            },
            {
              id: `${idPrefix}below`,
              label: i18n.translate('xpack.lens.xyChart.fillThreshold.below', {
                defaultMessage: 'Below',
              }),
              'data-test-subj': 'lnsXY_fill_below',
            },
          ]}
          idSelected={`${idPrefix}${currentYConfig?.fill || 'none'}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as FillStyle;
            setYConfig({ fill: newMode });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.xyChart.axisSide.icon', {
          defaultMessage: 'Icon',
        })}
      >
        <IconSelect
          value={currentYConfig?.icon}
          onChange={(newIcon) => {
            setYConfig({ icon: newIcon });
          }}
        />
      </EuiFormRow>
    </>
  );
};

const LineThicknessSlider = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange });
  return (
    <EuiRange
      fullWidth
      data-test-subj="lnsXY_lineThickness"
      value={inputValue}
      showInput
      min={1}
      max={50}
      compressed
      onChange={(e) => {
        handleInputChange(Number(e.currentTarget.value));
      }}
    />
  );
};
