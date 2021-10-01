/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './xy_config_panel.scss';
import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { debounce } from 'lodash';
import { EuiFormRow, EuiColorPicker, EuiColorPickerProps, EuiToolTip, EuiIcon } from '@elastic/eui';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State } from '../types';
import { FormatFactory, layerTypes } from '../../../common';
import { getSeriesColor } from '../state_helpers';
import {
  defaultThresholdColor,
  getAccessorColorConfig,
  getColorAssignments,
} from '../color_assignment';
import { getSortedAccessors } from '../to_expression';
import { updateLayer } from '.';
import { TooltipWrapper } from '../../shared_components';

const tooltipContent = {
  auto: i18n.translate('xpack.lens.configPanel.color.tooltip.auto', {
    defaultMessage: 'Lens automatically picks colors for you unless you specify a custom color.',
  }),
  custom: i18n.translate('xpack.lens.configPanel.color.tooltip.custom', {
    defaultMessage: 'Clear the custom color to return to “Auto” mode.',
  }),
  disabled: i18n.translate('xpack.lens.configPanel.color.tooltip.disabled', {
    defaultMessage:
      'Individual series cannot be custom colored when the layer includes a “Break down by.“',
  }),
};

export const ColorPicker = ({
  state,
  setState,
  layerId,
  accessor,
  frame,
  formatFactory,
  paletteService,
  label,
  disableHelpTooltip,
}: VisualizationDimensionEditorProps<State> & {
  formatFactory: FormatFactory;
  paletteService: PaletteRegistry;
  label?: string;
  disableHelpTooltip?: boolean;
}) => {
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const disabled = Boolean(layer.splitAccessor);

  const overwriteColor = getSeriesColor(layer, accessor);
  const currentColor = useMemo(() => {
    if (overwriteColor || !frame.activeData) return overwriteColor;
    if (layer.layerType === layerTypes.THRESHOLD) {
      return defaultThresholdColor;
    }

    const datasource = frame.datasourceLayers[layer.layerId];
    const sortedAccessors: string[] = getSortedAccessors(datasource, layer);

    const colorAssignments = getColorAssignments(
      state.layers,
      { tables: frame.activeData },
      formatFactory
    );
    const mappedAccessors = getAccessorColorConfig(
      colorAssignments,
      frame,
      {
        ...layer,
        accessors: sortedAccessors.filter((sorted) => layer.accessors.includes(sorted)),
      },
      paletteService
    );

    return mappedAccessors.find((a) => a.columnId === accessor)?.color || null;
  }, [overwriteColor, frame, paletteService, state.layers, accessor, formatFactory, layer]);

  const [color, setColor] = useState(currentColor);

  const handleColor: EuiColorPickerProps['onChange'] = (text, output) => {
    setColor(text);
    if (output.isValid || text === '') {
      updateColorInState(text, output);
    }
  };

  const updateColorInState: EuiColorPickerProps['onChange'] = useMemo(
    () =>
      debounce((text, output) => {
        const newYConfigs = [...(layer.yConfig || [])];
        const existingIndex = newYConfigs.findIndex((yConfig) => yConfig.forAccessor === accessor);
        if (existingIndex !== -1) {
          if (text === '') {
            newYConfigs[existingIndex] = { ...newYConfigs[existingIndex], color: undefined };
          } else {
            newYConfigs[existingIndex] = { ...newYConfigs[existingIndex], color: output.hex };
          }
        } else {
          newYConfigs.push({
            forAccessor: accessor,
            color: output.hex,
          });
        }
        setState(updateLayer(state, { ...layer, yConfig: newYConfigs }, index));
      }, 256),
    [state, setState, layer, accessor, index]
  );

  const inputLabel =
    label ??
    i18n.translate('xpack.lens.xyChart.seriesColor.label', {
      defaultMessage: 'Series color',
    });

  const colorPicker = (
    <EuiColorPicker
      data-test-subj="indexPattern-dimension-colorPicker"
      compressed
      isClearable={Boolean(overwriteColor)}
      onChange={handleColor}
      color={disabled ? '' : color || currentColor}
      disabled={disabled}
      placeholder={i18n.translate('xpack.lens.xyChart.seriesColor.auto', {
        defaultMessage: 'Auto',
      })}
      aria-label={inputLabel}
    />
  );

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={
        <TooltipWrapper
          delay="long"
          position="top"
          tooltipContent={color && !disabled ? tooltipContent.custom : tooltipContent.auto}
          condition={!disableHelpTooltip}
        >
          <span>
            {inputLabel}
            {!disableHelpTooltip && (
              <>
                {''}
                <EuiIcon
                  type="questionInCircle"
                  color="subdued"
                  size="s"
                  className="eui-alignTop"
                />
              </>
            )}
          </span>
        </TooltipWrapper>
      }
    >
      {disabled ? (
        <EuiToolTip
          position="top"
          content={tooltipContent.disabled}
          delay="long"
          anchorClassName="eui-displayBlock"
        >
          {colorPicker}
        </EuiToolTip>
      ) : (
        colorPicker
      )}
    </EuiFormRow>
  );
};
