/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { applyMatrix3, distance, angle } from '../lib/vector2';
import { Vector2, Matrix3 } from '../types';
import { useResolverTheme } from './defs';

interface ElapsedTimeProps {
  readonly scaledTypeSize: number;
  readonly backgroundColor: string;
}

const StyledElapsedTime = styled.div<ElapsedTimeProps>`
  background-color: ${(props) => props.backgroundColor};
  color: ${() => useResolverTheme().colorMap.resolverEdgeText};
  font-size: ${(props) => `${props.scaledTypeSize}px`};
  font-weight: bold;
  position: absolute;
  top: 50%;
  white-space: nowrap;
  left: 50%;
  padding: 6px 8px;
  border-radius: 999px;
  transform: translate(-50%, -50%) rotateX(35deg);
  user-select: none;
`;

/**
 * A placeholder line segment view that connects process nodes.
 */
const EdgeLineComponent = React.memo(
  ({
    className,
    elapsedTime,
    startPosition,
    endPosition,
    projectionMatrix,
  }: {
    /**
     * A className string provided by `styled`
     */
    className?: string;
    /**
     * Time elapsed betweeen process nodes
     */
    elapsedTime?: string;
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
    const [magFactorX] = projectionMatrix;
    const { colorMap } = useResolverTheme();

    /**
     * We render the line using a short, long, `div` element. The length of this `div`
     * should be the same as the distance between the start and end points.
     */
    const length = distance(screenStart, screenEnd);

    const minimumFontSize = 10;
    const slopeOfFontScale = 7.5;
    const fontSizeAdjustmentForScale = magFactorX > 1 ? slopeOfFontScale * (magFactorX - 1) : 0;
    const scaledTypeSize = minimumFontSize + fontSizeAdjustmentForScale;

    const style = {
      left: `${screenStart[0]}px`,
      top: `${screenStart[1]}px`,
      width: `${length}px`,
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

    return (
      <div role="presentation" className={className} style={style}>
        {elapsedTime && (
          <StyledElapsedTime
            backgroundColor={colorMap.resolverEdge}
            scaledTypeSize={scaledTypeSize}
          >
            {elapsedTime}
          </StyledElapsedTime>
        )}
      </div>
    );
  }
);

EdgeLineComponent.displayName = 'EdgeLine';

export const EdgeLine = styled(EdgeLineComponent)`
  position: absolute;
  height: ${({ projectionMatrix }) => {
    const [magFactorX] = projectionMatrix;
    const minimumFontSize = 12;
    const slopeOfFontScale = 8.5;
    const fontSizeAdjustmentForScale = magFactorX > 1 ? slopeOfFontScale * (magFactorX - 1) : 0;
    const scaledTypeSize = minimumFontSize + fontSizeAdjustmentForScale;
    return `${scaledTypeSize}px`;
  }};
  background-color: ${() => useResolverTheme().colorMap.resolverEdge};
  /* contain: strict; */
`;
