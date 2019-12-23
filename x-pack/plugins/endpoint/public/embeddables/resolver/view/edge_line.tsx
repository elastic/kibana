/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2 } from '../types';
import * as selectors from '../store/selectors';

export const EdgeLine = styled(
  React.memo(
    ({
      className,
      startPosition,
      endPosition,
    }: {
      className?: string;
      startPosition: Vector2;
      endPosition: Vector2;
    }) => {
      const projectionMatrix = useSelector(selectors.projectionMatrix);
      const [left, top] = applyMatrix3(startPosition, projectionMatrix);
      const length = distance(startPosition[0], startPosition[1], endPosition[0], endPosition[1]);
      const deltaX = endPosition[0] - startPosition[0];
      const deltaY = endPosition[1] - startPosition[1];
      const angle = -Math.atan2(deltaY, deltaX);
      /**
       * https://www.mathsisfun.com/algebra/distance-2-points.html
       */
      function distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      }

      const style = {
        left: left + 'px',
        top: top + 'px',
        width: length + 'px',
        transformOrigin: 'top left',
        transform: `translateY(-50%) rotateZ(${angle}rad)`,
      };
      return <div className={className} style={style} />;
    }
  )
)`
  position: absolute;
  height: 3px;
  background-color: #d4d4d4;
  color: #333333;
`;
