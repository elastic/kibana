/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { MonitorSparkline, MonitorSparklineProps } from '../monitor_sparkline';

describe('MonitorSparkline component', () => {
  let props: MonitorSparklineProps;
  beforeEach(() => {
    props = {
      dangerColor: 'A danger color',
      monitor: {
        id: {
          key: 'test',
          url: null,
        },
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
        ping: null,
      },
    };
  });

  it('renders a series when there are down items', () => {
    const component = shallowWithIntl(<MonitorSparkline {...props} />);
    expect(component).toMatchSnapshot();
  });

  it('renders null when there are no down items', () => {
    props.monitor.downSeries = [];
    const component = shallowWithIntl(<MonitorSparkline {...props} />);
    expect(component).toEqual({});
  });

  it('renders null when downSeries is null', () => {
    props.monitor.downSeries = null;
    const component = shallowWithIntl(<MonitorSparkline {...props} />);
    expect(component).toEqual({});
  });

  it('renders nothing if the down count has no counts', () => {
    props.monitor.downSeries = [
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
    const component = shallowWithIntl(<MonitorSparkline {...props} />);
    expect(component).toEqual({});
  });
});
