/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LineSeries, CurveType, Fit, ScaleType } from '@elastic/charts';
import { LocationDurationLine } from '../../../../common/types';
import { microToMilli, microToSec } from '../../../lib/formatting';
import { MS_LABEL, SEC_LABEL } from '../translations';

interface Props {
  monitorType: string;
  lines: LocationDurationLine[];
}

export const DurationLineSeriesList = ({ monitorType, lines }: Props) => (
  <>
    {lines.map(({ name, line }) => (
      <LineSeries
        curve={CurveType.CURVE_MONOTONE_X}
        // this id is used for the line chart representing the average duration length
        data={line.map(({ x, y }) => [x, y || null])}
        id={`loc-avg-${name}`}
        key={`loc-line-${name}`}
        name={name}
        xAccessor={0}
        xScaleType={ScaleType.Time}
        yAccessors={[1]}
        yScaleType={ScaleType.Linear}
        fit={Fit.Linear}
        timeZone="local"
        tickFormat={(d) =>
          monitorType === 'browser'
            ? `${microToSec(d)} ${SEC_LABEL}`
            : `${microToMilli(d)} ${MS_LABEL}`
        }
      />
    ))}
  </>
);
