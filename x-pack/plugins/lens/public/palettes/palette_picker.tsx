/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSuperSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { palettes, PaletteDefinition } from './palettes';

export function PalettePicker(props: {
  paletteName?: string;
  onChange: (props: { paletteName?: string; paletteCustomColors?: string[] }) => void;
}) {
  return (
    <EuiSuperSelect
      className="lensPalettePicker__swatchesPopover"
      valueOfSelected={props.paletteName || 'eui'}
      options={Object.entries(palettes).map(([id, palette]) => ({
        value: id,
        inputDisplay: (
          <div className="lensPalettePicker__swatch" style={{ width: '100%' }}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={1}>
                <span className="lensPalettePicker__label">{palette.name}</span>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <PaletteSwatch palette={palette} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      }))}
      onChange={value => {
        props.onChange({ paletteName: value });
      }}
    />
  );
}

export const PaletteSwatch = ({ palette }: { palette: PaletteDefinition }) => {
  let colorBoxes;

  if ('buildCategorical' in palette) {
    colorBoxes = palette
      .buildCategorical(10)
      .map(color => (
        <div key={color} className="lensPaletteSwatch__box" style={{ backgroundColor: color }} />
      ));
  } else {
    colorBoxes = [
      <div
        key="gradient"
        className="lensPaletteSwatch__box"
        style={{ background: `linear-gradient(90deg, ${palette.gradientColors.join(', ')})` }}
      />,
    ];
  }

  return (
    <div className="lensPaletteSwatch">
      <div className="lensPaletteSwatch__foreground">{colorBoxes}</div>
    </div>
  );
};
