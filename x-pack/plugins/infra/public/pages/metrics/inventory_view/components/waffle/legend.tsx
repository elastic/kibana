/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { euiStyled } from '../../../../../../../observability/public';
import { InfraFormatter, InfraWaffleMapBounds, InfraWaffleMapLegend } from '../../../../../lib/lib';
import { GradientLegend } from './gradient_legend';
import { LegendControls } from './legend_controls';
import { isInfraWaffleMapGradientLegend, isInfraWaffleMapStepLegend } from '../../lib/type_guards';
import { StepLegend } from './steps_legend';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
interface Props {
  legend: InfraWaffleMapLegend;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
  formatter: InfraFormatter;
}

interface LegendControlOptions {
  auto: boolean;
  bounds: InfraWaffleMapBounds;
}

export const Legend: React.FC<Props> = ({ dataBounds, legend, bounds, formatter }) => {
  const {
    changeBoundsOverride,
    changeAutoBounds,
    autoBounds,
    boundsOverride,
  } = useWaffleOptionsContext();
  return (
    <LegendContainer>
      <LegendControls
        dataBounds={dataBounds}
        bounds={bounds}
        autoBounds={autoBounds}
        boundsOverride={boundsOverride}
        onChange={(options: LegendControlOptions) => {
          changeBoundsOverride(options.bounds);
          changeAutoBounds(options.auto);
        }}
      />
      {isInfraWaffleMapGradientLegend(legend) && (
        <GradientLegend formatter={formatter} legend={legend} bounds={bounds} />
      )}
      {isInfraWaffleMapStepLegend(legend) && <StepLegend formatter={formatter} legend={legend} />}
    </LegendContainer>
  );
};

const LegendContainer = euiStyled.div`
  position: absolute;
  bottom: 0px;
  left: 10px;
  right: 10px;
`;
