/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { applyMatrix3, distance, angle } from '../lib/vector2';
import { Vector2, Matrix3 } from '../types';

/**
 * A placeholder line segment view that connects process nodes.
 */
export const EdgeLine = styled(
  React.memo(
    ({
      className,
      startPosition,
      endPosition,
      projectionMatrix,
    }: {
      /**
       * A className string provided by `styled`
       */
      className?: string;
      /**
       * The postion of first point in the line segment. In 'world' coordinates.
       */
      startPosition: Vector2;
      /**
       * The postion of second point in the line segment. In 'world' coordinates.
       */
      endPosition: Vector2;
      /**
       * projectionMatrix which can be used to convert `startPosition` and `endPosition` to screen coordinates.
       */
      projectionMatrix: Matrix3;
    }) => {
      /**
       * Convert the start and end positions, which are in 'world' coordinates,
       * to `left` and `top` css values.
       */
      const screenStart = applyMatrix3(startPosition, projectionMatrix);
      const screenEnd = applyMatrix3(endPosition, projectionMatrix);

      /**
       * We render the line using a short, long, `div` element. The length of this `div`
       * should be the same as the distance between the start and end points.
       */
      const length = distance(screenStart, screenEnd);

      const style = {
        left: screenStart[0] + 'px',
        top: screenStart[1] + 'px',
        width: length + 'px',
        /**
         * Transform from the left of the div, as the left side of the `div` is positioned
         * at the start point of the line segment.
         */
        transformOrigin: 'top left',
        /**
         * Translate the `div` in the y axis to accomodate for the height of the `div`.
         * Also rotate the `div` in the z axis so that it's angle matches the angle
         * between the start and end points.
         */
        transform: `translateY(-50%) rotateZ(${angle(screenStart, screenEnd)}rad)`,
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
