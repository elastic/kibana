/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { FunctionComponent, ReactNode } from 'react';
import tinycolor from 'tinycolor2';

export interface Props {
  /** Any valid CSS color. If not a valid CSS string, the dot will be transparent and checkered */
  value?: string;
  /** Nodes to display within the dot.  Should fit within the constraints. */
  children?: ReactNode;
}

export const ColorDot: FunctionComponent<Props> = ({ value, children }) => {
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
  value: PropTypes.string,
  children: PropTypes.node,
};
