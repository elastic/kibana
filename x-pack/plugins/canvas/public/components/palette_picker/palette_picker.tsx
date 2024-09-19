/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { palettes, ColorPalette } from '../../../common/lib/palettes';

const strings = {
  getEmptyPaletteLabel: () =>
    i18n.translate('xpack.canvas.palettePicker.emptyPaletteLabel', {
      defaultMessage: 'None',
    }),
  getNoPaletteFoundErrorTitle: () =>
    i18n.translate('xpack.canvas.palettePicker.noPaletteFoundErrorTitle', {
      defaultMessage: 'Color palette not found',
    }),
};

interface RequiredProps {
  id?: string;
  onChange?: (palette: ColorPalette) => void;
  palette: ColorPalette;
  clearable?: false;
}

interface ClearableProps {
  id?: string;
  onChange?: (palette: ColorPalette | null) => void;
  palette: ColorPalette | null;
  clearable: true;
}

type Props = RequiredProps | ClearableProps;

const findPalette = (colorPalette: ColorPalette | null, colorPalettes: ColorPalette[] = []) => {
  const palette = colorPalettes.filter((cp) => cp.id === colorPalette?.id)[0] ?? null;
  if (palette === null) {
    return colorPalettes.filter((cp) => isEqual(cp.colors, colorPalette?.colors))[0] ?? null;
  }

  return palette;
};

export const PalettePicker: FC<Props> = (props) => {
  const colorPalettes: EuiColorPalettePickerPaletteProps[] = palettes.map((item) => ({
    value: item.id,
    title: item.label,
    type: item.gradient ? 'gradient' : 'fixed',
    palette: item.colors,
  }));

  if (props.clearable) {
    const { palette, onChange = () => {} } = props;

    colorPalettes.unshift({
      value: 'clear',
      title: strings.getEmptyPaletteLabel(),
      type: 'text',
    });

    const onPickerChange = (value: string) => {
      const canvasPalette = palettes.find((item) => item.id === value);
      onChange(canvasPalette || null);
    };

    const foundPalette = findPalette(palette, palettes);

    return (
      <EuiColorPalettePicker
        id={props.id}
        compressed={true}
        palettes={colorPalettes}
        onChange={onPickerChange}
        valueOfSelected={foundPalette?.id ?? 'clear'}
      />
    );
  }

  const { palette, onChange = () => {} } = props;

  const onPickerChange = (value: string) => {
    const canvasPalette = palettes.find((item) => item.id === value);

    if (!canvasPalette) {
      throw new Error(strings.getNoPaletteFoundErrorTitle());
    }

    onChange(canvasPalette);
  };

  const foundPalette = findPalette(palette, palettes);

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

PalettePicker.propTypes = {
  id: PropTypes.string,
  palette: PropTypes.object,
  onChange: PropTypes.func,
  clearable: PropTypes.bool,
};
