/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import {
  InfraFormatter,
  InfraWaffleMapBounds,
  InfraWaffleMapGradientLegend,
  InfraWaffleMapGradientRule,
} from '../../../../../lib/lib';

interface Props {
  legend: InfraWaffleMapGradientLegend;
  bounds: InfraWaffleMapBounds;
  formatter: InfraFormatter;
}

const createTickRender =
  (bounds: InfraWaffleMapBounds, formatter: InfraFormatter) =>
  (rule: InfraWaffleMapGradientRule, index: number) => {
    const value = rule.value === 0 ? bounds.min : bounds.max * rule.value;
    const style = { left: `${rule.value * 100}%` };
    const label = formatter(value);
    return (
      <GradientLegendTick style={style} key={`legend-rule-${index}`}>
        <GradientLegendTickLine />
        <GradientLegendTickLabel>{label}</GradientLegendTickLabel>
      </GradientLegendTick>
    );
  };

export const GradientLegend: React.FC<Props> = ({ legend, bounds, formatter }) => {
  const maxValue = legend.rules.reduce((acc, rule) => {
    return acc < rule.value ? rule.value : acc;
  }, 0);
  const colorStops = legend.rules.map((rule) => {
    const percent = (rule.value / maxValue) * 100;
    return `${rule.color} ${percent}%`;
  });
  const style = {
    background: `linear-gradient(to right, ${colorStops})`,
  };
  return (
    <GradientLegendContainer style={style}>
      {legend.rules.map(createTickRender(bounds, formatter))}
    </GradientLegendContainer>
  );
};

const GradientLegendContainer = euiStyled.div`
  position: absolute;
  height: 10px;
  bottom: 0;
  left: 0;
  right: 40px;
`;

const GradientLegendTick = euiStyled.div`
  position: absolute;
  bottom: 0;
  top: -18px;
`;

const GradientLegendTickLine = euiStyled.div`
  position: absolute;
  background-color: ${(props) => props.theme.eui.euiBorderColor};
  width: 1px;
  left: 0;
  top: 15px;
  bottom: 0;
  ${GradientLegendTick}:first-child {
    top: 2px;
  }
  ${GradientLegendTick}:last-child {
    top: 2px;
  }
`;

const GradientLegendTickLabel = euiStyled.div`
  position: absolute;
  font-size: 11px;
  text-align: center;
  top: 0;
  left: 0;
  white-space: nowrap;
  transform: translate(-50%, 0);
  ${GradientLegendTick}:first-child & {
    padding-left: 5px;
    transform: translate(0, 0);
  }
  ${GradientLegendTick}:last-child & {
    padding-right: 5px;
    transform: translate(-100%, 0);
  }
`;
