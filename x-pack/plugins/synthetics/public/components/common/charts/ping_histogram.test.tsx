/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import DateMath from '@kbn/datemath';
import { PingHistogramComponent, PingHistogramComponentProps } from './ping_histogram';
import { render } from '../../../lib/helper/rtl_helpers';
import { mockDataPlugin, mockMoment, mockMomentTimezone } from '../../../lib/helper/test_helpers';

describe('PingHistogram component', () => {
  let dateMathSpy: any;
  beforeAll(() => {
    mockMoment();
    mockMomentTimezone();
    mockDataPlugin();
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(20);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  const props: PingHistogramComponentProps = {
    absoluteStartDate: 1548697920000,
    absoluteEndDate: 1548700920000,
    data: {
      histogram: [
        { x: 1581068329000, downCount: 6, upCount: 33, y: 1 },
        { x: 1581068359000, downCount: 6, upCount: 30, y: 1 },
        { x: 1581068389000, downCount: 6, upCount: 33, y: 1 },
        { x: 1581068419000, downCount: 6, upCount: 30, y: 1 },
        { x: 1581068449000, downCount: 6, upCount: 33, y: 1 },
        { x: 1581068479000, downCount: 6, upCount: 30, y: 1 },
        { x: 1581068509000, downCount: 6, upCount: 33, y: 1 },
        { x: 1581068539000, downCount: 6, upCount: 30, y: 1 },
        { x: 1581068569000, downCount: 6, upCount: 33, y: 1 },
        { x: 1581068599000, downCount: 6, upCount: 30, y: 1 },
        { x: 1581068629000, downCount: 6, upCount: 33, y: 1 },
        { x: 1581068659000, downCount: 6, upCount: 30, y: 1 },
        { x: 1581068689000, downCount: 6, upCount: 33, y: 1 },
        { x: 1581068719000, downCount: 6, upCount: 30, y: 1 },
        { x: 1581068749000, downCount: 5, upCount: 34, y: 1 },
        { x: 1581068779000, downCount: 3, upCount: 33, y: 1 },
        { x: 1581068809000, downCount: 3, upCount: 36, y: 1 },
        { x: 1581068839000, downCount: 3, upCount: 33, y: 1 },
        { x: 1581068869000, downCount: 3, upCount: 36, y: 1 },
        { x: 1581068899000, downCount: 3, upCount: 33, y: 1 },
        { x: 1581068929000, downCount: 3, upCount: 36, y: 1 },
        { x: 1581068959000, downCount: 3, upCount: 33, y: 1 },
        { x: 1581068989000, downCount: 3, upCount: 36, y: 1 },
        { x: 1581069019000, downCount: 1, upCount: 11, y: 1 },
      ],
      minInterval: 60,
    },
  };

  it('renders the component without errors', () => {
    const { getByLabelText, getByText } = render(<PingHistogramComponent {...props} />);
    expect(getByText('Pings over time'));
    expect(
      getByLabelText(
        'Bar Chart showing uptime status over time from 15 minutes ago to 15 minutes ago.'
      )
    );
  });
});
