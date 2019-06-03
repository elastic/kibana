/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorBarSeries, MonitorBarSeriesProps } from '../monitor_bar_series';

describe('MonitorBarSeries component', () => {
  let props: MonitorBarSeriesProps;
  beforeEach(() => {
    props = {
      absoluteStartDate: 1548697920000,
      absoluteEndDate: 1548700920000,
      dangerColor: 'A danger color',
      downSeries: [
        {
          x: 123,
          y: 1,
        },
        {
          x: 124,
          y: 1,
        },
        {
          x: 125,
          y: 1,
        },
      ],
    };
  });

  it('renders a series when there are down items', () => {
    const component = shallowWithIntl(<MonitorBarSeries {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('renders null when there are no down items', () => {
    props.downSeries = [];
    const component = shallowWithIntl(<MonitorBarSeries {...props} />);
    expect(component).toEqual({});
  });

  it('renders nothing if the down count has no counts', () => {
    props.downSeries = [
      {
        x: 123,
        y: 0,
      },
      {
        x: 124,
        y: null,
      },
      {
        x: 125,
        y: 0,
      },
    ];
    const component = shallowWithIntl(<MonitorBarSeries {...props} />);
    expect(component).toEqual({});
  });
});
