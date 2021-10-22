/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { flowRight, identity } from 'lodash';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { ColorStop, CustomColorPalette, StopsPalettePickerProps } from '../types';
import { PalettePicker } from '../palette_picker';
import { StopColorPicker } from './stop_color_picker';
import { Palette } from './types';
import {
  reduceColorsByStopsSize,
  transformPaletteToColorStops,
  mergeColorStopsWithPalette,
  deleteColorStop,
  updateColorStop,
  addNewColorStop,
  getOverridenPaletteOptions,
} from './utils';
import { ColorPalette } from '../../../../common/lib/palettes';

const defaultStops = [0, 1];
const MIN_STOPS = 2;

export const StopsPalettePicker: FC<StopsPalettePickerProps> = (props) => {
  const { palette, onChange } = props;
  const stops = useMemo(
    () => (!palette?.stops || !palette.stops.length ? defaultStops : palette.stops),
    [palette?.stops]
  );

  const colors = useMemo(
    () => reduceColorsByStopsSize(palette?.colors, stops.length),
    [palette?.colors, stops.length]
  );

  const onChangePalette = useCallback(
    (newPalette: ColorPalette | CustomColorPalette | null) => {
      if (newPalette) {
        const newColors = reduceColorsByStopsSize(newPalette?.colors, stops.length);
        props.onChange?.({
          ...newPalette,
          colors: newColors,
          stops,
          ...getOverridenPaletteOptions(),
        });
      }
    },
    [props, stops]
  );

  useEffectOnce(() => {
    onChangePalette(palette);
  });

  const paletteColorStops = useMemo(
    () => transformPaletteToColorStops({ stops, colors }),
    [colors, stops]
  );

  const updatePalette = useCallback(
    (fn: (colorStops: ColorStop[]) => ColorStop[]) =>
      flowRight<ColorStop[][], ColorStop[], Palette, void>(
        onChange ?? identity,
        mergeColorStopsWithPalette(palette),
        fn
      ),
    [onChange, palette]
  );

  const deleteColorStopAndApply = useCallback(
    (index: number) => updatePalette(deleteColorStop(index))(paletteColorStops),
    [paletteColorStops, updatePalette]
  );

  const updateColorStopAndApply = useCallback(
    (index: number, colorStop: ColorStop) =>
      updatePalette(updateColorStop(index, colorStop))(paletteColorStops),
    [paletteColorStops, updatePalette]
  );

  const addColorStopAndApply = useCallback(
    () => updatePalette(addNewColorStop(palette))(paletteColorStops),
    [palette, paletteColorStops, updatePalette]
  );

  const stopColorPickers = paletteColorStops.map(({ id, ...rest }, index) => (
    <StopColorPicker
      {...rest}
      key={index}
      removable={index >= MIN_STOPS}
      onDelete={() => deleteColorStopAndApply(index)}
      onChange={(cp: ColorStop) => updateColorStopAndApply(index, cp)}
    />
  ));

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <PalettePicker
            additionalPalettes={palette?.id === 'custom' ? [palette] : []}
            palette={props.palette ?? undefined}
            onChange={onChangePalette}
            clearable={false}
          />
        </EuiFlexItem>
        <EuiFormRow label="Color stops">
          <>{stopColorPickers}</>
        </EuiFormRow>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      <EuiButtonEmpty
        iconType="plusInCircle"
        color="primary"
        aria-label={'Add color stop'}
        size="xs"
        flush="left"
        onClick={addColorStopAndApply}
      >
        Add color stop
      </EuiButtonEmpty>
    </>
  );
};
