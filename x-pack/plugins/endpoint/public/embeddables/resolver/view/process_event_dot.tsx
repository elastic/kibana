/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { applyMatrix3 } from '../lib/vector2';
import { Vector2, Matrix3 } from '../types';
import { ResolverEvent } from '../../../../common/types';
import { eventName } from '../../../../common/models';

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
      event: ResolverEvent;
      /**
       * projectionMatrix which can be used to convert `position` to screen coordinates.
       */
      projectionMatrix: Matrix3;
    }) => {
      /**
       * Convert the position, which is in 'world' coordinates, to screen coordinates.
       */
      const [left, top] = applyMatrix3(position, projectionMatrix);
      const style = {
        left: (left - 20).toString() + 'px',
        top: (top - 20).toString() + 'px',
      };
      return (
        <span className={className} style={style} data-test-subj={'resolverNode'}>
          name: {eventName(event)}
          <br />
          x: {position[0]}
          <br />
          y: {position[1]}
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
  /**
   * Give the element a button-like appearance.
   */
  user-select: none;
  border: 1px solid black;
  box-sizing: border-box;
  border-radius: 10%;
  padding: 4px;
  white-space: nowrap;
`;
