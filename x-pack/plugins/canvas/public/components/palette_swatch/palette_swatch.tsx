/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { Palette } from '../../../common/lib/palettes';

interface Props {
  palette: Palette;
}

export const PaletteSwatch: FC<Props> = ({ palette }) => {
  let colorBoxes;
  const { gradient, colors } = palette;

  if (!gradient) {
    colorBoxes = colors.map((color) => (
      <div
        key={color}
        className="canvasPaletteSwatch__box"
        style={{
          backgroundColor: color,
        }}
      />
    ));
  } else {
    colorBoxes = [
      <div
        key="gradient"
        className="canvasPaletteSwatch__box"
        style={{
          background: `linear-gradient(90deg, ${colors.join(', ')})`,
        }}
      />,
    ];
  }

  return (
    <div className="canvasPaletteSwatch">
      <div className="canvasPaletteSwatch__background canvasCheckered" />
      <div className="canvasPaletteSwatch__foreground">{colorBoxes}</div>
    </div>
  );
};

PaletteSwatch.propTypes = {
  palette: PropTypes.shape({
    colors: PropTypes.array,
    gradient: PropTypes.bool,
  }),
};
