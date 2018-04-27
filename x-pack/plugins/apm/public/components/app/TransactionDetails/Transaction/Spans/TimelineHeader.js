/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import Legend from '../../../../shared/charts/Legend';
import {
  fontSizes,
  colors,
  unit,
  units,
  px,
  truncate
} from '../../../../../style/variables';

import TooltipOverlay from '../../../../shared/TooltipOverlay';

const TimelineHeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${px(unit * 1.5)} ${px(units.plus)} 0 ${px(units.plus)};
  line-height: 1.5;
`;

const Heading = styled.div`
  font-size: ${fontSizes.large};
  color: ${colors.gray2};
  ${truncate('90%')};
`;

const Legends = styled.div`
  display: flex;
`;

export default function TimelineHeader({ legends, transactionName }) {
  return (
    <TimelineHeaderContainer>
      <TooltipOverlay content={transactionName || 'N/A'}>
        <Heading>{transactionName || 'N/A'}</Heading>
      </TooltipOverlay>
      <Legends>
        {legends.map(({ color, label }) => (
          <Legend clickable={false} key={color} color={color} text={label} />
        ))}
      </Legends>
    </TimelineHeaderContainer>
  );
}
