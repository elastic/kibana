/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2, ProcessEvent, Matrix3 } from '../types';

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

      return (
        <svg
          className={className}
          style={style}
          viewBox="-15 -5 30 10"
          preserveAspectRatio="xMidYMid slice"
        >
          <use xlinkHref={`#node_icon_curve`} x="-15.5" y="-5" width="31" height="10" opacity="1" />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="3"
            fill="white"
            stroke="#333"
            strokeWidth=".35"
            paintOrder="stroke"
          >
            {event.data_buffer.process_name}
          </text>

          {magFactorX >= 1.75 ? (
            <>
              <text
                x="0"
                y="-2.1"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="1.25"
                fill="#fff"
                stroke="#333"
                strokeWidth=".25"
                paintOrder="stroke"
              >
                Process
              </text>
            </>
          ) : null}
          {magFactorX >= 2.75 && event.data_buffer.signature_status !== 'trusted' ? (
            <>
              <text
                x="0"
                y="2.45"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="1.25"
                fill="yellow"
                stroke="#333"
                strokeWidth=".25"
                paintOrder="stroke"
              >
                No Trusted Signature
              </text>
            </>
          ) : (
            <></>
          )}
        </svg>
      );
    }
  )
)`
  position: absolute;
  display: block;
  width: 120px;
  height: 40px;
  text-align: left;
  font-size: 10px;
  user-select: none;
  box-sizing: border-box;
  border-radius: 10%;
  padding: 4px;
  white-space: nowrap;
`;
