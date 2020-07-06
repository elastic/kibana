/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl, renderWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import moment from 'moment';
import { BrowserRouter as Router } from 'react-router-dom';
import { MostRecentError } from '../most_recent_error';
import { MonitorDetails, MonitorError } from '../../../../../../common/runtime_types';

describe('MostRecentError component', () => {
  let monitorDetails: MonitorDetails;
  let monitorError: MonitorError;

  beforeAll(() => {
    moment.prototype.fromNow = jest.fn(() => '5 days ago');
  });

  beforeEach(() => {
    monitorError = {
      type: 'io',
      message: 'Get https://expired.badssl.com: x509: certificate has expired or is not yet valid',
    };
    monitorDetails = {
      monitorId: 'bad-ssl',
      timestamp: '2019-11-30T01:57:37.792Z',
      error: monitorError,
    };
  });

  it('validates props with shallow render', () => {
    const component = shallowWithIntl(
      <Router>
        <MostRecentError
          monitorId={monitorDetails.monitorId}
          error={monitorDetails.error}
          timestamp={monitorDetails.timestamp}
        />
      </Router>
    );
    expect(component).toMatchSnapshot();
  });

  it('renders properly with mock data', () => {
    const component = renderWithIntl(
      <Router>
        <MostRecentError
          monitorId={monitorDetails.monitorId}
          error={monitorDetails.error}
          timestamp={monitorDetails.timestamp}
        />
      </Router>
    );
    expect(component).toMatchSnapshot();
  });
});
