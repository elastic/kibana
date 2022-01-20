/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { applyMatrix3, distance, angle } from '../models/vector2';
import { Vector2, Matrix3, EdgeLineMetadata } from '../types';
import { fontSize } from './font_size';
import { useColors } from './use_colors';

interface StyledEdgeLine {
  readonly resolverEdgeColor: string;
  readonly magFactorX: number;
}

const StyledEdgeLine = styled.div<StyledEdgeLine>`
  position: absolute;
  height: ${(props) => {
    return `${fontSize(props.magFactorX, 12, 8.5)}px`;
  }};
  background-color: ${(props) => props.resolverEdgeColor};
  z-index: 10;
`;

interface StyledElapsedTime {
  readonly backgroundColor: string;
  readonly leftPct: number;
  readonly scaledTypeSize: number;
  readonly textColor: string;
}

const StyledElapsedTime = styled.div<StyledElapsedTime>`
  background-color: ${(props) => props.backgroundColor};
  color: ${(props) => props.textColor};
  font-size: ${(props) => `${props.scaledTypeSize}px`};
  font-weight: bold;
  max-width: 75%;
  overflow: hidden;
  position: absolute;
  text-overflow: ellipsis;
  top: 50%;
  white-space: nowrap;
  left: ${(props) => `${props.leftPct}%`};
  padding: 6px 8px;
  border-radius: 999px; // generate pill shape
  transform: translate(-50%, -50%);
  user-select: none;
`;

/**
 * A placeholder line segment view that connects process nodes.
 */
export const EdgeLine = React.memo(
  ({
    className,
    edgeLineMetadata,
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
    edgeLineMetadata?: EdgeLineMetadata;
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
    const [xScale] = projectionMatrix;
    const colorMap = useColors();
    const elapsedTime = edgeLineMetadata?.elapsedTime;

    /**
     * We render the line using a short, long, `div` element. The length of this `div`
     * should be the same as the distance between the start and end points.
     */
    const length = distance(screenStart, screenEnd);
    const scaledTypeSize = fontSize(xScale, 10, 7.5);

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

    let elapsedTimeLeftPosPct = 50;

    /**
     * Calculates a fractional offset from 0 -> 5% as magFactorX decreases from 1 to a min of .5
     */
    if (xScale < 1) {
      const fractionalOffset = (1 / xScale) * ((1 - xScale) * 10);
      elapsedTimeLeftPosPct += fractionalOffset;
    }

    return (
      <StyledEdgeLine
        className={className}
        style={style}
        resolverEdgeColor={colorMap.resolverEdge}
        magFactorX={xScale}
        data-test-subj="resolver:graph:edgeline"
      >
        {elapsedTime && (
          <StyledElapsedTime
            backgroundColor={colorMap.resolverEdge}
            leftPct={elapsedTimeLeftPosPct}
            scaledTypeSize={scaledTypeSize}
            textColor={colorMap.resolverEdgeText}
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.resolver.elapsedTime"
              defaultMessage="{duration} {durationType}"
              values={{
                duration: elapsedTime.duration,
                durationType: elapsedTime.durationType,
              }}
            />
          </StyledElapsedTime>
        )}
      </StyledEdgeLine>
    );
  }
);
