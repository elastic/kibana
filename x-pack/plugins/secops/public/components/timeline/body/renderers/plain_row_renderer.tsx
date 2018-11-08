/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { RowRenderer } from '.';
import { ECS } from '../../ecs';

const PlainRow = styled.div`
  width: 100%;
  transition: 700ms background, 700ms border-color, 1s transform, 1s box-shadow;
  border-color: transparent;
  transition-delay: 0s;
  &:hover {
    background: #f0f8ff;
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.025);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }
`;

export const plainRowRenderer: RowRenderer = {
  isInstance: () => true,
  renderRow: (data: ECS, children: React.ReactNode) => <PlainRow>{children}</PlainRow>,
};
