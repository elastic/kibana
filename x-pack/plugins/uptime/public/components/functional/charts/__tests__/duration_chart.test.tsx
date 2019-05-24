/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { DurationChart } from '../duration_chart';
import {
  MonitorDurationAreaPoint,
  MonitorDurationAveragePoint,
} from '../../../../../common/graphql/types';

describe('DurationChart', () => {
  it('passes duration data to a chart', () => {
    const durationArea: MonitorDurationAreaPoint[] = [
      { x: 123, yMin: 2342512, yMax: 2642512 },
      { x: 124, yMin: 2442512, yMax: 2742512 },
      { x: 125, yMin: 2342512, yMax: 2642512 },
    ];
    const durationLine: MonitorDurationAveragePoint[] = [
      { x: 123, y: 2542512 },
      { x: 124, y: 2642512 },
      { x: 125, y: 2542512 },
    ];
    const component = shallowWithIntl(
      <DurationChart
        durationArea={durationArea}
        durationLine={durationLine}
        meanColor="foo"
        rangeColor="bar"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
