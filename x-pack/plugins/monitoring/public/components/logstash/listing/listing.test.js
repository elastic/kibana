/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Listing } from './listing';

const expectedData = [
  {
    jvm: {
      mem: {
        heap_used_percent: 27,
      },
    },
    logstash: {
      pipeline: {
        batch_size: 125,
        workers: 4,
      },
      http_address: '127.0.0.1:9600',
      name: 'Elastic-MBP.local',
      host: 'Elastic-MBP.local',
      version: '8.0.0',
      uuid: '4134a00e-89e4-4896-a3d4-c3a9aa03a594',
      status: 'green',
    },
    process: {
      cpu: {
        percent: 0,
      },
    },
    os: {
      cpu: {
        load_average: {
          '1m': 2.54248046875,
        },
      },
    },
    events: {
      out: 3505,
    },
    reloads: {
      failures: 0,
      successes: 0,
    },
    availability: true,
  },
];

describe('Listing', () => {
  it('should render with expected props', () => {
    const props = {
      data: expectedData,
      angular: {
        scope: null,
        kbnUrl: null,
      },
      sorting: {
        sort: 'asc',
      },
      setupMode: {},
    };

    const component = shallow(<Listing {...props} />);
    expect(component.find('EuiMonitoringTable')).toMatchSnapshot();
  });

  it('should render with certain data pieces missing', () => {
    const props = {
      data: expectedData.map(item => {
        const { os, process, logstash, jvm, events, ...rest } = item; // eslint-disable-line no-unused-vars
        return rest;
      }),
      angular: {
        scope: null,
        kbnUrl: null,
      },
      sorting: {
        sort: 'asc',
      },
      setupMode: {},
    };

    const component = shallow(<Listing {...props} />);
    expect(component.find('EuiMonitoringTable')).toMatchSnapshot();
  });
});
