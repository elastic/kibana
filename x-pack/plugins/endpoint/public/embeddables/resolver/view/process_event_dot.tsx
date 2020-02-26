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

      const style = {
        left: `${left}px`,
        top: `${top}px`,
        transform: `translateY(-50%) translateX(-50%) scale(${magFactorX})`,
      };

      const markerBaseSize = 15;
      const markerSize = (magFactor: number) => {
        return markerBaseSize * (1 / magFactor);
      };

      const markerPosition = (magFactor: number) => {
        return -markerBaseSize/2 * (1 / magFactorX);
      };

      return (
        <svg
          className={className}
          style={style}
          viewBox="-15 -15 90 30"
          preserveAspectRatio="xMidYMid meet"
          role="treeitem"
          aria-level={event.data_buffer.depth}
        >
          <use
            role="presentation"
            xlinkHref={`#${SymbolIds.runningProcessCube}`}
            x={markerPosition(magFactorX)}
            y={markerPosition(magFactorX)}
            width={markerSize(magFactorX)}
            height={markerSize(magFactorX)}
            opacity="1"
            style={{ stroke: `${bgColor}`, fill: '#FFFFFF' }}
          />
          <use
            role="presentation"
            xlinkHref={
              magFactorX >= 1.75
                ? `#${SymbolIds.processNodeWithHorizontalRule}`
                : `#${SymbolIds.processNode}`
            }
            x={markerPosition(magFactorX) + markerSize(magFactorX) -2}
            y={markerPosition(magFactorX) + .25 * markerSize(magFactorX)}
            width="31"
            height="10"
            opacity="1"
          />
          <text
            x="0"
            y={magFactorX >= 1.75 ? '-6' : '-7.5'}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="3"
            fill={NamedColors.empty}
            paintOrder="stroke"
            tabIndex={-1}
          >
            {event.data_buffer.process_name}
          </text>

          {magFactorX >= 1.75 ? (
            <>
              <text
                x="0"
                y="-9.6"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="1.25"
                fill={NamedColors.empty}
                paintOrder="stroke"
                style={{ textTransform: 'uppercase' }}
              >
                Terminated Process
              </text>
            </>
          ) : null}
        </svg>
      );
    }
  )
)`
  position: absolute;
  display: block;
  width: 360px;
  height: 120px;
  text-align: left;
  font-size: 10px;
  user-select: none;
  box-sizing: border-box;
  border-radius: 10%;
  padding: 4px;
  white-space: nowrap;
  contain: strict;
`;
