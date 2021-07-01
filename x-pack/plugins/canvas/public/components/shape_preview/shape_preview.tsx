/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, JSXElementConstructor, useState } from 'react';
import PropTypes from 'prop-types';
import { ViewBoxParams } from '../../../../../../src/plugins/expression_shape/common';

interface Props {
  shape?: JSXElementConstructor<any>;
}

export const ShapePreview: FC<Props> = ({ shape: Shape }) => {
  const [shapeViewBox, setShapeViewBox] = useState<ViewBoxParams>({
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
  });

  if (!Shape) {
    return <div className="canvasShapePreview" />;
  }

  const weight = 5;
  let { minX, minY, width, height } = shapeViewBox;
  minX -= weight / 2;
  minY -= weight / 2;
  width += weight;
  height += weight;

  const shapeAttributes = {
    fill: 'none',
    stroke: 'black',
    viewBox: {
      minX,
      minY,
      width,
      height,
    },
  };
  return (
    <div className="canvasShapePreview">
      <Shape shapeAttributes={shapeAttributes} setViewBoxParams={setShapeViewBox} />
    </div>
  );
};

ShapePreview.propTypes = {
  shape: PropTypes.string,
};
