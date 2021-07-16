/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiLoadingSpinner } from '@elastic/eui';
import { getShape, Shape } from '../../../../../../src/plugins/expression_shape/public';
import {
  withSuspense,
  ViewBoxParams,
  ShapeType,
  ShapeProps,
  useLoad,
} from '../../../../../../src/plugins/presentation_util/public';

interface Props {
  shape?: Shape;
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

export const ShapePreview: FC<Props> = ({ shape }) => {
  const shapeLoader = shape ? getShape(shape) : undefined;
  const { data, error, loading } = useLoad<{ default: ShapeType }>(shapeLoader);

  if (!shapeLoader || !data || !data.default) return <div className="canvasShapePreview" />;
  if (loading) return <EuiLoadingSpinner />;
  if (error) throw new Error(error.message);

  const loadedShape = data?.default || {};
  const ShapeComponent = withSuspense<ShapeProps>(loadedShape.Component);
  return (
    <div className="canvasShapePreview">
      <ShapeComponent
        shapeAttributes={{
          fill: 'none',
          stroke: 'black',
          viewBox: getViewBox(5, loadedShape.data?.viewBox),
        }}
      />
    </div>
  );
};

ShapePreview.propTypes = {
  shape: PropTypes.string,
};
