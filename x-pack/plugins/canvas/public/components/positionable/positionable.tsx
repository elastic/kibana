/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactElement, CSSProperties } from 'react';
import PropTypes from 'prop-types';
import { matrixToCSS } from '../../lib/dom';
import { TransformMatrix3d } from '../../lib/aeroelastic';

interface Props {
  children: ReactElement;
  transformMatrix: TransformMatrix3d;
  height: number;
  width: number;
}

export const Positionable: FC<Props> = ({ children, transformMatrix, width, height }) => {
  // Throw if there is more than one child
  const childNode = React.Children.only(children);

  const matrix = (transformMatrix.map((n, i) =>
    i < 12 ? n : Math.round(n)
  ) as any) as TransformMatrix3d;

  const newStyle: CSSProperties = {
    width,
    height,
    marginLeft: -width / 2,
    marginTop: -height / 2,
    position: 'absolute',
    transform: matrixToCSS(matrix),
  };

  return (
    <div className="canvasPositionable canvasInteractable" style={newStyle}>
      {childNode}
    </div>
  );
};

Positionable.propTypes = {
  children: PropTypes.element.isRequired,
  transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
};
