/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2, ProcessEvent } from '../types';
import * as selectors from '../store/selectors';
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
       * A color that the Resolver is using for the background, to
       * create a "mask" effect for markers on EdgeLines
       */
      bgColor?: string;
    }) => {
      /**
       * Convert the position, which is in 'world' coordinates, to screen coordinates.
       */
      const projectionMatrix = useSelector(selectors.projectionMatrix);
      const [left, top] = applyMatrix3(position, projectionMatrix);

      const [magFactorX] = projectionMatrix;

      const style = {
        left: `${left}px`,
        top: `${top}px`,
        transform: `translateY(-50%) translateX(-50%) scale(${magFactorX})`,
      };

      const markerSize = (magFactor: number) => {
        return magFactor >= 1 ? 4 * (1 / magFactor) : 3;
      };

      const markerPosition = (magFactor: number) => {
        return magFactor >= 1 ? -2 * (1 / magFactorX) : -1.5;
      };

      return (
        <svg
          className={className}
          style={style}
          viewBox="-15 -15 30 30"
          preserveAspectRatio="xMidYMid meet"
          role="treeitem"
          aria-level={event.data_buffer.depth}
        >
          <use
            role="presentation"
            xlinkHref={`#${SymbolIds.solidHexagon}`}
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
            x="-15.5"
            y="-12.5"
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
            stroke={NamedColors.strokeBehindEmpty}
            strokeWidth=".35"
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
                stroke={NamedColors.strokeBehindEmpty}
                strokeWidth=".25"
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
  width: 120px;
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
