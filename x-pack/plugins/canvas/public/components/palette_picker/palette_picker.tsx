/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { palettes, ColorPalette } from '../../../common/lib/palettes';
import { ComponentStrings } from '../../../i18n';

const { PalettePicker: strings } = ComponentStrings;

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

    return (
      <EuiColorPalettePicker
        id={props.id}
        compressed={true}
        palettes={colorPalettes}
        onChange={onPickerChange}
        valueOfSelected={palette ? palette.id : 'clear'}
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

  return (
    <EuiColorPalettePicker
      id={props.id}
      compressed={true}
      palettes={colorPalettes}
      onChange={onPickerChange}
      valueOfSelected={palette.id}
    />
  );
};

PalettePicker.propTypes = {
  id: PropTypes.string,
  palette: PropTypes.object,
  onChange: PropTypes.func,
  clearable: PropTypes.bool,
};
