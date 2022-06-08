/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import chroma from 'chroma-js';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiColorPicker,
  EuiColorPickerProps,
  EuiToolTip,
  EuiIcon,
  euiPaletteColorBlind,
} from '@elastic/eui';
import type { PaletteRegistry } from '@kbn/coloring';
import type { VisualizationDimensionEditorProps } from '../../types';
import { State } from '../types';
import { FormatFactory } from '../../../common';
import { getSeriesColor } from '../state_helpers';
import { getAccessorColorConfig, getColorAssignments } from '../color_assignment';
import { getSortedAccessors } from '../to_expression';
import { TooltipWrapper } from '../../shared_components';
import { getDataLayers, isDataLayer } from '../visualization_helpers';

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

function isValidPonyfill(colorString: string) {
  // we're using an old version of chroma without the valid function
  try {
    chroma(colorString);
    return true;
  } catch (e) {
    return false;
  }
}

export function isValidColor(colorString: string) {
  // chroma can handle also hex values with alpha channel/transparency
  // chroma accepts also hex without #, so test for it
  return colorString !== '' && /^#/.test(colorString) && isValidPonyfill(colorString);
}

export const ColorPicker = ({
  label,
  disableHelpTooltip,
  disabled,
  setConfig,
  defaultColor,
  overwriteColor,
  showAlpha,
}: {
  overwriteColor?: string;
  defaultColor?: string;
  setConfig: (config: { color?: string }) => void;
  label?: string;
  disableHelpTooltip?: boolean;
  disabled?: boolean;
  showAlpha?: boolean;
}) => {
  const [color, setColor] = useState(overwriteColor || defaultColor);
  const [validColor, setValidColor] = useState(overwriteColor || defaultColor);
  const [currentColorAlpha, setCurrentColorAlpha] = useState(
    (color && isValidColor(color) && chroma(color)?.alpha()) || 1
  );
  const unflushedChanges = useRef(false);

  useEffect(() => {
    if (!unflushedChanges.current && overwriteColor !== validColor) {
      if (overwriteColor && validColor) {
        setColor(overwriteColor);
        setCurrentColorAlpha(
          (isValidColor(overwriteColor) && chroma(overwriteColor)?.alpha()) || 1
        );
      }
    }
    unflushedChanges.current = false;
  }, [validColor, overwriteColor]);

  const handleColor: EuiColorPickerProps['onChange'] = (text, output) => {
    setColor(text);
    unflushedChanges.current = true;
    if (output.isValid) {
      setValidColor(output.hex);
      setCurrentColorAlpha((color && isValidColor(color) && chroma(color)?.alpha()) || 1);
      setConfig({ color: output.hex });
    }
    if (text === '') {
      setConfig({ color: undefined });
    }
  };

  const inputLabel =
    label ??
    i18n.translate('xpack.lens.xyChart.seriesColor.label', {
      defaultMessage: 'Series color',
    });

  const colorPicker = (
    <EuiColorPicker
      fullWidth
      data-test-subj="indexPattern-dimension-colorPicker"
      compressed
      isClearable={Boolean(overwriteColor)}
      onChange={handleColor}
      color={disabled ? '' : color}
      disabled={disabled}
      placeholder={
        defaultColor?.toUpperCase() ||
        i18n.translate('xpack.lens.xyChart.seriesColor.auto', {
          defaultMessage: 'Auto',
        })
      }
      aria-label={inputLabel}
      showAlpha={showAlpha}
      swatches={
        currentColorAlpha === 1
          ? euiPaletteColorBlind()
          : euiPaletteColorBlind().map((c) => chroma(c).alpha(currentColorAlpha).hex())
      }
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

export const ColorPicker2 = ({
  state,
  layerId,
  accessor,
  frame,
  formatFactory,
  paletteService,
  label,
  disableHelpTooltip,
  disabled,
  setConfig,
  showAlpha,
  defaultColor,
}: VisualizationDimensionEditorProps<State> & {
  formatFactory: FormatFactory;
  paletteService: PaletteRegistry;
  label?: string;
  disableHelpTooltip?: boolean;
  disabled?: boolean;
  setConfig: (config: { color?: string }) => void;
  showAlpha?: boolean;
  defaultColor?: string;
}) => {
  const index = state.layers.findIndex((l) => l.layerId === layerId);
  const layer = state.layers[index];
  const overwriteColor = getSeriesColor(layer, accessor);
  const currentColor = useMemo(() => {
    if (overwriteColor || !frame.activeData) return overwriteColor;
    if (defaultColor) {
      return defaultColor;
    }
    if (isDataLayer(layer)) {
      const sortedAccessors: string[] = getSortedAccessors(
        frame.datasourceLayers[layer.layerId] ?? layer.accessors,
        layer
      );
      const colorAssignments = getColorAssignments(
        getDataLayers(state.layers),
        { tables: frame.activeData ?? {} },
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
    }
  }, [
    overwriteColor,
    frame,
    paletteService,
    state.layers,
    accessor,
    formatFactory,
    layer,
    defaultColor,
  ]);

  const [color, setColor] = useState(currentColor);
  const [validColor, setValidColor] = useState(currentColor);
  const [currentColorAlpha, setCurrentColorAlpha] = useState(
    (color && isValidColor(color) && chroma(color)?.alpha()) || 1
  );
  const unflushedChanges = useRef(false);

  useEffect(() => {
    if (!unflushedChanges.current && overwriteColor !== validColor) {
      if (overwriteColor && validColor) {
        setColor(overwriteColor);
        setCurrentColorAlpha(
          (isValidColor(overwriteColor) && chroma(overwriteColor)?.alpha()) || 1
        );
      }
    }
    unflushedChanges.current = false;
  }, [validColor, overwriteColor]);

  const handleColor: EuiColorPickerProps['onChange'] = (text, output) => {
    setColor(text);
    unflushedChanges.current = true;
    if (output.isValid) {
      setValidColor(output.hex);
      setCurrentColorAlpha((color && isValidColor(color) && chroma(color)?.alpha()) || 1);
      setConfig({ color: output.hex });
    }
    if (text === '') {
      setConfig({ color: undefined });
    }
  };

  const inputLabel =
    label ??
    i18n.translate('xpack.lens.xyChart.seriesColor.label', {
      defaultMessage: 'Series color',
    });

  const colorPicker = (
    <EuiColorPicker
      fullWidth
      data-test-subj="indexPattern-dimension-colorPicker"
      compressed
      isClearable={Boolean(overwriteColor)}
      onChange={handleColor}
      color={disabled ? '' : color}
      disabled={disabled}
      placeholder={
        defaultColor?.toUpperCase() ||
        currentColor?.toUpperCase() ||
        i18n.translate('xpack.lens.xyChart.seriesColor.auto', {
          defaultMessage: 'Auto',
        })
      }
      aria-label={inputLabel}
      showAlpha={showAlpha}
      swatches={
        currentColorAlpha === 1
          ? euiPaletteColorBlind()
          : euiPaletteColorBlind().map((c) => chroma(c).alpha(currentColorAlpha).hex())
      }
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
