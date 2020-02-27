/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2, ProcessEvent, Matrix3 } from '../types';
import { SymbolIds, NamedColors } from './defs';

/**
 * A placeholder view for a process node.
 */
export const ProcessEventDot = styled(
  React.memo(
    ({
      className,
      position,
      event,
      projectionMatrix,
      bgColor,
    }: {
      /**
       * A `className` string provided by `styled`
       */
      className?: string;
      /**
       * The positon of the process node, in 'world' coordinates.
       */
      position: Vector2;
      /**
       * An event which contains details about the process node.
       */
      event: ProcessEvent;
      /**
       * projectionMatrix which can be used to convert `position` to screen coordinates.
       */
      projectionMatrix: Matrix3;
      /**
       * A color that the Resolver is using for the background, to
       * create a "mask" effect for markers on EdgeLines
       */
      bgColor?: string;
    }) => {
      /**
       * Convert the position, which is in 'world' coordinates, to screen coordinates.
       */
      const [left, top] = applyMatrix3(position, projectionMatrix);

      const [magFactorX] = projectionMatrix;

      const nodeViewportStyle = {
        left: `${left}px`,
        top: `${top}px`,
        width: `${360 * magFactorX}px`,
        height: `${120 * magFactorX}px`,
        transform: `translateX(-${.172413 * 360 * magFactorX + 10}px) translateY(-${.73684 * 120 * magFactorX}px)`,
      };

      const markerBaseSize = 15;
      const markerSize = (magFactor: number) => {
        return markerBaseSize;
      };

      const markerPositionOffset = (magFactor: number) => {
        return -markerBaseSize/2;
      };

      const labelYOffset = (magFactor: number) => {
        return markerPositionOffset(magFactorX) + .25 * markerSize(magFactorX) - .5;
      };

      const labelYHeight = (magFactor: number) => {
        return markerSize(magFactorX) / 1.76470
      };

      return (
        <svg
          className={className}
          style={nodeViewportStyle}
          viewBox="-15 -15 90 30"
          preserveAspectRatio="xMidYMid meet"
          role="treeitem"
          aria-level={event.data_buffer.depth}
        >
          <use
            role="presentation"
            xlinkHref={`#${SymbolIds.runningProcessCube}`}
            x={markerPositionOffset(magFactorX)}
            y={markerPositionOffset(magFactorX)}
            width={markerSize(magFactorX)}
            height={markerSize(magFactorX)}
            opacity="1"
          />
          <use
            role="presentation"
            xlinkHref={`#${SymbolIds.processNode}`}
            x={markerPositionOffset(magFactorX) + markerSize(magFactorX) - .5}
            y={labelYOffset(magFactorX)}
            width={(markerSize(magFactorX) / 1.76470) * 5}
            height={markerSize(magFactorX) / 1.76470}
            opacity="1"
          />
          <text
            x={markerPositionOffset(magFactorX) + .7 * markerSize(magFactorX) + 50/2}
            y={labelYOffset(magFactorX) + labelYHeight(magFactorX) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="3"
            fontWeight="bold"
            fill={NamedColors.empty}
            paintOrder="stroke"
            tabIndex={-1}
          >
            {event.data_buffer.process_name}
          </text> 
          <text
            x={markerPositionOffset(magFactorX) + markerSize(magFactorX) + 10.5}
            y={labelYOffset(magFactorX) - 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="2.25"
            fill={NamedColors.activeNoWarning}
            paintOrder="stroke"
            fontWeight="bold"
            style={{ textTransform: 'uppercase', letterSpacing: '-0.01px'}}
          >
            Running Process
          </text>
            
         
        </svg>
      );
    }
  )
)`
  position: absolute;
  display: block;
  
  text-align: left;
  font-size: 10px;
  user-select: none;
  box-sizing: border-box;
  border-radius: 10%;
  padding: 4px;
  white-space: nowrap;
  contain: strict;
  will-change: width, height;
`;
