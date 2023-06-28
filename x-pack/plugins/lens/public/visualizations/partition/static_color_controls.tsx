/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar.scss';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiColorPicker, euiPaletteColorBlind, EuiToolTip } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-ui-components/public';
import { PaletteRegistry } from '@kbn/coloring';
import { PieLayerState, PieVisualizationState } from '../../../common/types';
import { getDefaultColorForMultiMetricDimension, hasNonCollapsedSliceBy } from './visualization';
import { VisualizationDimensionEditorProps } from '../../types';

type DimensionEditorProps = VisualizationDimensionEditorProps<PieVisualizationState> & {
  paletteService: PaletteRegistry;
};

export function StaticColorControls({
  state,
  paletteService,
  accessor,
  setState,
  datasource,
  currentLayer,
}: DimensionEditorProps & { currentLayer: PieLayerState }) {
  const colorLabel = i18n.translate('xpack.lens.pieChart.color', {
    defaultMessage: 'Color',
  });

  console.log('accessor', accessor);

  const disabledMessage = hasNonCollapsedSliceBy(currentLayer)
    ? ['pie', 'donut'].includes(state.shape)
      ? i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseSliceBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Slice by" dimensions.',
        })
      : i18n.translate('xpack.lens.pieChart.colorPicker.disabledBecauseGroupBy', {
          defaultMessage:
            'You are unable to apply custom colors to individual slices when the layer includes one or more "Group by" dimensions.',
        })
    : '';

  const defaultColor = getDefaultColorForMultiMetricDimension({
    layer: currentLayer,
    columnId: accessor,
    paletteService,
    datasource,
  });

  const setColor = useCallback(
    (color: string) => {
      const newColorsByDimension = { ...currentLayer.colorsByDimension };

      if (color) {
        newColorsByDimension[accessor] = color;
      } else {
        delete newColorsByDimension[accessor];
      }

      setState({
        ...state,
        layers: state.layers.map((layer) =>
          layer.layerId === currentLayer.layerId
            ? {
                ...layer,
                colorsByDimension: newColorsByDimension,
              }
            : layer
        ),
      });
    },
    [accessor, currentLayer.colorsByDimension, currentLayer.layerId, setState, state]
  );

  const { inputValue: currentColor, handleInputChange: handleColorChange } =
    useDebouncedValue<string>(
      {
        onChange: setColor,
        value: currentLayer.colorsByDimension?.[accessor] || defaultColor,
      },
      { allowFalsyValue: true }
    );

  const isDisabled = Boolean(disabledMessage);

  const renderColorPicker = () => (
    <EuiColorPicker
      fullWidth
      compressed
      disabled={isDisabled}
      isClearable={true}
      placeholder={
        isDisabled
          ? i18n.translate('xpack.lens.pieChart.colorPicker.auto', {
              defaultMessage: 'Auto',
            })
          : defaultColor
      }
      onChange={(color: string) => handleColorChange(color)}
      color={isDisabled ? '' : currentColor}
      aria-label={colorLabel}
      showAlpha={false}
      swatches={euiPaletteColorBlind()}
    />
  );

  return (
    <EuiFormRow display="columnCompressed" fullWidth label={colorLabel}>
      {disabledMessage ? (
        <EuiToolTip
          position="top"
          delay="long"
          anchorClassName="eui-displayBlock"
          content={disabledMessage}
        >
          {renderColorPicker()}
        </EuiToolTip>
      ) : (
        renderColorPicker()
      )}
    </EuiFormRow>
  );
}
