/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { ReactNode, SFC } from 'react';
import tinycolor from 'tinycolor2';

export interface Props {
  /** Any valid CSS color. If not a valid CSS string, the dot will not render */
  value: string;
  /** Nodes to display within the dot.  Should fit within the constraints. */
  children?: ReactNode;
}

export const ColorDot: SFC<Props> = ({ value, children }) => {
  const tc = tinycolor(value);
  if (!tc.isValid()) {
    return null;
  }

  return (
    <div className="canvasColorDot">
      <div className="canvasColorDot__background canvasCheckered" />
      <div className="canvasColorDot__foreground" style={{ background: tc.toRgbString() }}>
        {children}
      </div>
    </div>
  );
};

ColorDot.propTypes = {
  value: PropTypes.string,
  children: PropTypes.node,
};
