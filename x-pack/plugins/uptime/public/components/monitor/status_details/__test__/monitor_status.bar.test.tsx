/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React from 'react';
import { MonitorStatusBar } from '../status_bar';
import { Ping } from '../../../../../common/runtime_types';
import * as redux from 'react-redux';
import { renderWithRouter } from '../../../../lib';
import { createMemoryHistory } from 'history';

describe('MonitorStatusBar component', () => {
  let monitorStatus: Ping;
  let monitorLocations: any;

  beforeEach(() => {
    monitorStatus = {
      docId: 'few213kl',
      timestamp: moment(new Date()).subtract(15, 'm').toString(),
      monitor: {
        duration: {
          us: 1234567,
        },
        id: 'id1',
        status: 'up',
        type: 'http',
      },
      url: {
        full: 'https://www.example.com/',
      },
    };

    monitorLocations = {
      monitorId: 'secure-avc',
      locations: [
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'Berlin', location: { lat: '52.487448', lon: ' 13.394798' } },
        },
        {
          summary: { up: 4, down: 0 },
          geo: { name: 'st-paul', location: { lat: '52.487448', lon: ' 13.394798' } },
        },
      ],
    };

    const spy = jest.spyOn(redux, 'useDispatch');
    spy.mockReturnValue(jest.fn());

    jest.spyOn(redux, 'useSelector').mockImplementation((fn, d) => {
      if (fn.name === ' monitorStatusSelector') {
        return monitorStatus;
      } else {
        return monitorLocations;
      }
    });
  });

  it('renders', () => {
    const history = createMemoryHistory({
      initialEntries: ['/aWQx/'],
    });
    history.location.key = 'test';
    const component = renderWithRouter(<MonitorStatusBar />, history);
    expect(component).toMatchSnapshot();
  });
});
