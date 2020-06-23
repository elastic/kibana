/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';

import { euiStyled } from '../../../../../../../observability/public';
import {
  InfraFormatter,
  InfraWaffleMapBounds,
  InfraWaffleMapLegend,
  SteppedGradientLegendRT,
  StepLegendRT,
  GradientLegendRT,
} from '../../../../../lib/lib';
import { GradientLegend } from './gradient_legend';
import { LegendControls } from './legend_controls';
import { StepLegend } from './steps_legend';
import { useWaffleOptionsContext, WaffleLegendOptions } from '../../hooks/use_waffle_options';
import { SteppedGradientLegend } from './stepped_gradient_legend';
interface Props {
  legend: InfraWaffleMapLegend;
  bounds: InfraWaffleMapBounds;
  dataBounds: InfraWaffleMapBounds;
  formatter: InfraFormatter;
}

interface LegendControlOptions {
  auto: boolean;
  bounds: InfraWaffleMapBounds;
  legend: WaffleLegendOptions;
}

export const Legend: React.FC<Props> = ({ dataBounds, legend, bounds, formatter }) => {
  const {
    changeBoundsOverride,
    changeAutoBounds,
    autoBounds,
    legend: legendOptions,
    changeLegend,
    boundsOverride,
  } = useWaffleOptionsContext();
  const handleChange = useCallback(
    (options: LegendControlOptions) => {
      changeBoundsOverride(options.bounds);
      changeAutoBounds(options.auto);
      changeLegend(options.legend);
    },
    [changeBoundsOverride, changeAutoBounds, changeLegend]
  );
  return (
    <LegendContainer>
      <LegendControls
        options={legendOptions}
        dataBounds={dataBounds}
        bounds={bounds}
        autoBounds={autoBounds}
        boundsOverride={boundsOverride}
        onChange={handleChange}
      />
      {GradientLegendRT.is(legend) && (
        <GradientLegend formatter={formatter} legend={legend} bounds={bounds} />
      )}
      {StepLegendRT.is(legend) && <StepLegend formatter={formatter} legend={legend} />}
      {SteppedGradientLegendRT.is(legend) && (
        <SteppedGradientLegend formatter={formatter} bounds={bounds} legend={legend} />
      )}
    </LegendContainer>
  );
};

const LegendContainer = euiStyled.div`
  position: absolute;
  bottom: 0px;
  left: 10px;
  right: 10px;
`;
