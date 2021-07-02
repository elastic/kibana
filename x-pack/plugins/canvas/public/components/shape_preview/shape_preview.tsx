/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import PropTypes from 'prop-types';
import { ViewBoxParams, ShapeType } from '../../../../../../src/plugins/presentation_util/public';

interface Props {
  shape?: ShapeType;
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

  function getViewBox(defaultWidth: number, defaultViewBox: ViewBoxParams): ViewBoxParams {
    const { minX, minY, width, height } = defaultViewBox;
    return {
      minX: minX - defaultWidth / 2,
      minY: minY - defaultWidth / 2,
      width: width + defaultWidth,
      height: height + defaultWidth,
    };
  }

  return (
    <div className="canvasShapePreview">
      <Shape
        shapeAttributes={{
          fill: 'none',
          stroke: 'black',
          viewBox: getViewBox(5, shapeViewBox),
        }}
        setViewBoxParams={(viewBox?: ViewBoxParams | void) => {
          if (viewBox) setShapeViewBox(viewBox);
        }}
      />
    </div>
  );
};

ShapePreview.propTypes = {
  shape: PropTypes.func,
};
