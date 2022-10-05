/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BandFillColorAccessorInput, Color } from '@elastic/charts';
import { Chart, Goal, Settings } from '@elastic/charts';
import React from 'react';
import styled from 'styled-components';

import { useTheme } from '../../../../../../common/components/charts/common';
import { getFillColor } from '../../../data_quality_panel/tabs/summary_tab/helpers';
import { getRotation, MIN_ROTATE } from './helpers';
import * as i18n from '../translations';
import type { PartitionedFieldMetadata } from '../../../types';

const Needle = styled.div<{ $transform: number }>`
  animation: 1s ease-in 1s rotate;
  border: 2px solid ${({ theme }) => theme.eui.euiColorPrimary};
  height: 1px;
  left: 100px;
  position: relative;
  top: -100px;
  transform-origin: bottom left;
  transform: ${({ $transform }) => `rotate(${$transform}deg)`};
  width: 85px;

  @keyframes rotate {
    0% {
      transform: rotate(${MIN_ROTATE}deg);
    }
    100% {
      transform: ${({ $transform }) => `rotate(${$transform}deg)`};
    }
  }
`;

const colorMap: { [k: number]: Color } = {
  33: getFillColor('not-ecs-compliant'),
  66: getFillColor('non-ecs'),
  100: getFillColor('ecs-compliant'),
};

const bandFillColor = (x: number): Color => colorMap[x];

interface Props {
  height: number;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  setSelectedTabId: (tabId: string) => void;
}

const domain = { min: 0, max: 100 };
const bands = [33, 66, 100];
const ticks: number[] = [];

const ChartBodyComponent: React.FC<Props> = ({
  height,
  partitionedFieldMetadata,
  setSelectedTabId,
}) => {
  const theme = useTheme();
  const transform = getRotation(partitionedFieldMetadata);

  return (
    <>
      <Chart size={height}>
        <Settings baseTheme={theme} />
        <Goal
          actual={0}
          bandFillColor={({ value }: BandFillColorAccessorInput) => bandFillColor(value)}
          bands={bands}
          base={0}
          centralMajor=""
          centralMinor=""
          domain={domain}
          id="ecs-goal-chart"
          labelMajor={i18n.ECS_COMPLIANCE_LABEL_MAJOR}
          labelMinor=""
          subtype="goal"
          target={100}
          ticks={ticks}
          tickValueFormatter={({ value }: BandFillColorAccessorInput) => String(value)}
        />
      </Chart>
      <Needle $transform={transform} />
    </>
  );
};

ChartBodyComponent.displayName = 'ChartBodyComponent';

export const ChartBody = React.memo(ChartBodyComponent);
