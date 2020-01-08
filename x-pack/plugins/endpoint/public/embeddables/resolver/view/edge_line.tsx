/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { applyMatrix3, distance, angle } from '../lib/vector2';
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
      const screenStart = applyMatrix3(startPosition, projectionMatrix);
      const screenEnd = applyMatrix3(endPosition, projectionMatrix);
      const length = distance(screenStart, screenEnd);

      const style = {
        left: screenStart[0] + 'px',
        top: screenStart[1] + 'px',
        width: length + 'px',
        transformOrigin: 'top left',
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
