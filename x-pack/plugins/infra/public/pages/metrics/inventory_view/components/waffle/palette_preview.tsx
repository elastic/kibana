/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { euiStyled } from '../../../../../../../observability/public';
import { InventoryColorPalette } from '../../../../../lib/lib';
import { getColorPalette } from '../../lib/get_color_palette';

interface Props {
  palette: InventoryColorPalette;
  steps: number;
  reverse: boolean;
}

export const PalettePreview = ({ steps, palette, reverse }: Props) => {
  const colors = getColorPalette(palette, steps, reverse);
  return (
    <Swatches>
      {colors.map((color) => (
        <Swatch key={color} style={{ backgroundColor: color }} />
      ))}
    </Swatches>
  );
};

const Swatch = euiStyled.div`
  width: 16px;
  height: 12px;
  flex: 0 0 auto;
  &:first-child {
    border-radius: ${(props) => props.theme.eui.euiBorderRadius} 0 0 ${(props) =>
  props.theme.eui.euiBorderRadius};
  }
  &:last-child {
    border-radius: 0 ${(props) => props.theme.eui.euiBorderRadius} ${(props) =>
  props.theme.eui.euiBorderRadius} 0;
`;

const Swatches = euiStyled.div`
  display: flex;
`;
