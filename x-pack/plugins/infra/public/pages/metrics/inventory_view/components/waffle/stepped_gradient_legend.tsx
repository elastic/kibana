/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { euiStyled } from '../../../../../../../observability/public';
import {
  InfraWaffleMapBounds,
  InfraFormatter,
  InfraWaffleMapSteppedGradientLegend,
} from '../../../../../lib/lib';

interface Props {
  legend: InfraWaffleMapSteppedGradientLegend;
  bounds: InfraWaffleMapBounds;
  formatter: InfraFormatter;
}

export const SteppedGradientLegend: React.FC<Props> = ({ legend, bounds, formatter }) => {
  return (
    <LegendContainer>
      <Ticks>
        <TickLabel value={0} bounds={bounds} formatter={formatter} />
        <TickLabel value={0.5} bounds={bounds} formatter={formatter} />
        <TickLabel value={1} bounds={bounds} formatter={formatter} />
      </Ticks>
      <GradientContainer>
        {legend.rules.map((rule, index) => (
          <GradientStep
            key={`step-${index}-${rule.value}`}
            style={{ backgroundColor: rule.color }}
          />
        ))}
      </GradientContainer>
    </LegendContainer>
  );
};

interface TickProps {
  bounds: InfraWaffleMapBounds;
  value: number;
  formatter: InfraFormatter;
}

const TickLabel = ({ value, bounds, formatter }: TickProps) => {
  const normalizedValue = value === 0 ? bounds.min : bounds.max * value;
  const style = { left: `${value * 100}%` };
  const label = formatter(normalizedValue);
  return <Tick style={style}>{label}</Tick>;
};

const GradientStep = euiStyled.div`
  height: ${(props) => props.theme.eui.paddingSizes.s};
  flex: 1 1 auto;
  &:first-child {
    border-radius: ${(props) => props.theme.eui.euiBorderRadius} 0 0 ${(props) =>
  props.theme.eui.euiBorderRadius};
  }
  &:last-child {
    border-radius: 0 ${(props) => props.theme.eui.euiBorderRadius} ${(props) =>
  props.theme.eui.euiBorderRadius} 0;
  }
`;

const Ticks = euiStyled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  top: -18px;
`;

const Tick = euiStyled.div`
  position: absolute;
  font-size: 11px;
  text-align: center;
  top: 0;
  left: 0;
  white-space: nowrap;
  transform: translate(-50%, 0);
  &:first-child {
    padding-left: 5px;
    transform: translate(0, 0);
  }
  &:last-child {
    padding-right: 5px;
    transform: translate(-100%, 0);
  }
`;

const GradientContainer = euiStyled.div`
  display: flex;
  flex-direction; row;
  align-items: stretch;
  flex-grow: 1;
`;

const LegendContainer = euiStyled.div`
  position: absolute;
  height: 10px;
  bottom: 0;
  left: 0;
  right: 40px;
`;
