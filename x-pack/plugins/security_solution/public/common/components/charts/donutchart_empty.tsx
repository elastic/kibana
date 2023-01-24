/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

interface DonutChartEmptyProps {
  size?: number;
  donutWidth?: number;
}

export const emptyDonutColor = '#FAFBFD';

const BigRing = styled.div<DonutChartEmptyProps>`
  border-radius: 50%;
  ${({ size }) =>
    `height: ${size}px;
    width: ${size}px;
    background-color: ${emptyDonutColor};
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

const EmptyDonutChartComponent: React.FC<DonutChartEmptyProps> = ({ size = 90, donutWidth = 20 }) =>
  size - donutWidth > 0 ? (
    <BigRing size={size} data-test-subj="empty-donut">
      <SmallRing size={size - donutWidth} data-test-subj="empty-donut-small" />
    </BigRing>
  ) : null;

export const DonutChartEmpty = React.memo(EmptyDonutChartComponent);
