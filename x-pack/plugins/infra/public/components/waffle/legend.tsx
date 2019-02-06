/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import styled from 'styled-components';
import { InfraFormatter, InfraWaffleMapBounds, InfraWaffleMapLegend } from '../../lib/lib';
import { GradientLegend } from './gradient_legend';
import { isInfraWaffleMapGradientLegend, isInfraWaffleMapStepLegend } from './lib/type_guards';
import { StepLegend } from './steps_legend';
interface Props {
  legend: InfraWaffleMapLegend;
  bounds: InfraWaffleMapBounds;
  formatter: InfraFormatter;
}

export const Legend: React.SFC<Props> = ({ legend, bounds, formatter }) => {
  return (
    <LegendContainer>
      {isInfraWaffleMapGradientLegend(legend) && (
        <GradientLegend formatter={formatter} legend={legend} bounds={bounds} />
      )}
      {isInfraWaffleMapStepLegend(legend) && <StepLegend formatter={formatter} legend={legend} />}
    </LegendContainer>
  );
};

const LegendContainer = styled.div`
  position: absolute;
  bottom: 10px;
  left: 10px;
  right: 10px;
`;
