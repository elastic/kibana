/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, RefCallback, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import {
  LazyShapeDrawer,
  ShapeDrawerComponentProps,
  getDefaultShapeData,
  SvgConfig,
  ShapeRef,
  ViewBoxParams,
} from '@kbn/expression-shape-plugin/public';
import { withSuspense } from '@kbn/presentation-util-plugin/public';

interface Props {
  shape?: string;
}

const ShapeDrawer = withSuspense<ShapeDrawerComponentProps, ShapeRef>(LazyShapeDrawer);

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
  const [shapeData, setShapeData] = useState<SvgConfig>(getDefaultShapeData());

  const shapeRef = useCallback<RefCallback<ShapeRef>>((node) => {
    if (node !== null) {
      setShapeData(node.getData());
    }
  }, []);

  if (!shape) return <div className="canvasShapePreview" />;
  return (
    <div className="canvasShapePreview">
      <ShapeDrawer
        ref={shapeRef}
        shapeType={shape}
        shapeAttributes={{
          fill: 'none',
          stroke: 'black',
          viewBox: getViewBox(5, shapeData.viewBox),
        }}
      />
    </div>
  );
};

ShapePreview.propTypes = {
  shape: PropTypes.string,
};
