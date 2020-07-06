/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithRouter, shallowWithRouter } from '../../../../lib';
import { MLJobLink } from '../ml_job_link';

describe('ML JobLink', () => {
  it('shallow renders without errors', () => {
    const wrapper = shallowWithRouter(
      <MLJobLink dateRange={{ to: '', from: '' }} basePath="" monitorId="testMonitor" />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('renders without errors', () => {
    const wrapper = renderWithRouter(
      <MLJobLink dateRange={{ to: '', from: '' }} basePath="" monitorId="testMonitor" />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
