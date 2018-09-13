import React from 'react';
import PropTypes from 'prop-types';

export const PaletteSwatch = ({ colors, gradient }) => {
  let colorBoxes;

  if (!gradient) {
    colorBoxes = colors.map(color => (
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
  colors: PropTypes.array,
  gradient: PropTypes.bool,
};
