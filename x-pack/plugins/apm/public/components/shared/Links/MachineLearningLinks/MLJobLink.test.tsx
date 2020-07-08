/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../utils/testHelpers';
import { MLJobLink } from './MLJobLink';

describe('MLJobLink', () => {
  it('should produce the correct URL with jobId', async () => {
    const href = await getRenderedHref(
      () => (
        <MLJobLink jobId="myservicename-mytransactiontype-high_mean_response_time" />
      ),
      { search: '?rangeFrom=now/w&rangeTo=now-4h' } as Location
    );

    expect(href).toEqual(
      `/basepath/app/ml#/timeseriesexplorer?_g=(ml%3A(jobIds%3A!(myservicename-mytransactiontype-high_mean_response_time))%2CrefreshInterval%3A(pause%3Atrue%2Cvalue%3A'0')%2Ctime%3A(from%3Anow%252Fw%2Cto%3Anow-4h))`
    );
  });
});
