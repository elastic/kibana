/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiColorPalettePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { RequiredComponentProps } from '../types';
import { findPalette, prepareColorPalette } from '../utils';

const strings = {
  getNoPaletteFoundErrorTitle: () =>
    i18n.translate('xpack.canvas.palettePicker.noPaletteFoundErrorTitle', {
      defaultMessage: 'Color palette not found',
    }),
};

export const DefaultPalettePicker: FC<RequiredComponentProps> = (props) => {
  const { palette, palettes, onChange = () => {} } = props;
  const colorPalettes = palettes.map(prepareColorPalette);

  const onPickerChange = (value: string) => {
    const canvasPalette = palettes.find((item) => item.id === value);
    if (!canvasPalette) {
      throw new Error(strings.getNoPaletteFoundErrorTitle());
    }

    onChange(canvasPalette);
  };

  const foundPalette = findPalette(palette ?? null, palettes);

  return (
    <EuiColorPalettePicker
      id={props.id}
      compressed={true}
      palettes={colorPalettes}
      onChange={onPickerChange}
      valueOfSelected={foundPalette?.id}
    />
  );
};
