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

export const ProcessEventDot = styled(
  React.memo(
    ({
      className,
      worldPosition,
      processEvent,
    }: {
      className?: string;
      worldPosition: Vector2;
      processEvent: ProcessEvent;
    }) => {
      const projectionMatrix = useSelector(selectors.projectionMatrix);
      const [left, top] = applyMatrix3(worldPosition, projectionMatrix);
      const style = {
        left: (left - 20).toString() + 'px',
        top: (top - 20).toString() + 'px',
      };
      return (
        <span className={className} style={style}>
          name: {processEvent.data_buffer.process_name}
          <br />
          x: {worldPosition[0]}
          <br />
          y: {worldPosition[1]}
        </span>
      );
    }
  )
)`
  position: absolute;
  width: 40px;
  height: 40px;
  text-align: left;
  font-size: 10px;
  user-select: none;
  border: 1px solid black;
  box-sizing: border-box;
  border-radius: 10%;
  padding: 4px;
  white-space: nowrap;
`;
