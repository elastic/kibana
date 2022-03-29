/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

interface DonutChartEmptyProps {
  size: number;
  donutWidth?: number;
}

const BigRing = styled.div<DonutChartEmptyProps>`
  border-radius: 50%;
  ${({ size }) =>
    `height: ${size}px;
    width: ${size}px;
    background-color: #FAFBFD;
    text-align: center;
    line-height: ${size}px;`}
`;

const SmallRing = styled.div<DonutChartEmptyProps>`
  border-radius: 50%;
  ${({ size }) => `
    height: ${size}px;
    width: ${size}px;
    background-color: white;
    display: inline-block;
    vertical-align: middle;`}
`;

const EmptyDonutChartComponent: React.FC<DonutChartEmptyProps> = ({ size, donutWidth = 20 }) =>
  size - donutWidth > 0 ? (
    <BigRing size={size}>
      <SmallRing size={size - donutWidth} />
    </BigRing>
  ) : null;

export const DonutChartEmpty = React.memo(EmptyDonutChartComponent);
