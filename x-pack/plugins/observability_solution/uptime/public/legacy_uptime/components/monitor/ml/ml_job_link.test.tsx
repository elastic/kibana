/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../lib/helper/rtl_helpers';
import { MLJobLink } from './ml_job_link';

describe('ML JobLink', () => {
  it('renders without errors', () => {
    const expectedHref = `/app/ml#/explorer?_g=(ml:(jobIds:!(testmonitor_high_latency_by_geo)),refreshInterval:(pause:!t,value:0),time:(from:'',to:''))&_a=(mlExplorerFilter:(filterActive:!t,filteredFields:!(monitor.id,testMonitor)),mlExplorerSwimlane:(viewByFieldName:observer.geo.name))`;
    const { getByRole, getByText } = render(
      <MLJobLink dateRange={{ to: '', from: '' }} basePath="" monitorId="testMonitor">
        <div>Test link</div>
      </MLJobLink>
    );

    const jobLink = getByRole('link');
    expect(jobLink.getAttribute('href')).toBe(expectedHref);
    expect(getByText('Test link'));
  });
});
