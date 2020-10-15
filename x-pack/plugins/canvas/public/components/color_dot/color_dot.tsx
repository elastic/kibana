/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactNode } from 'react';
import PropTypes from 'prop-types';
import tinycolor from 'tinycolor2';

interface Props {
  /** Nodes to display within the dot.  Should fit within the constraints. */
  children?: ReactNode;
  /** Any valid CSS color. If not a valid CSS string, the dot will be transparent and checkered */
  value?: string;
}

export const ColorDot: FC<Props> = ({ value, children }) => {
  const tc = tinycolor(value);
  let style = {};

  if (tc.isValid()) {
    style = { background: value };
  }

  return (
    <div className="canvasColorDot">
      <div className="canvasColorDot__background canvasCheckered" />
      <div className="canvasColorDot__foreground" style={style}>
        {children}
      </div>
    </div>
  );
};

ColorDot.propTypes = {
  children: PropTypes.node,
  value: PropTypes.string,
};
