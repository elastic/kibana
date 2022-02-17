/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../utils/test_helpers';
import { MLExplorerLink } from './mlexplorer_link';

describe('MLExplorerLink', () => {
  it('should produce the correct URL with jobId', async () => {
    const href = await getRenderedHref(
      () => (
        <MLExplorerLink jobId="myservicename-mytransactiontype-high_mean_response_time" />
      ),
      {
        search:
          '?rangeFrom=now/w&rangeTo=now-4h&refreshPaused=true&refreshInterval=0',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/app/ml/explorer?_g=(ml:(jobIds:!(myservicename-mytransactiontype-high_mean_response_time)),refreshInterval:(pause:!t,value:0),time:(from:now%2Fw,to:now-4h))&_a=(explorer:(mlExplorerFilter:(),mlExplorerSwimlane:()))"`
    );
  });

  it('correctly encodes time range values', async () => {
    const href = await getRenderedHref(
      () => (
        <MLExplorerLink jobId="apm-production-485b-high_mean_transaction_duration" />
      ),
      {
        search:
          '?rangeFrom=2020-07-29T17:27:29.000Z&rangeTo=2020-07-29T18:45:00.000Z&refreshInterval=10000&refreshPaused=true',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/app/ml/explorer?_g=(ml:(jobIds:!(apm-production-485b-high_mean_transaction_duration)),refreshInterval:(pause:!t,value:10000),time:(from:'2020-07-29T17:27:29.000Z',to:'2020-07-29T18:45:00.000Z'))&_a=(explorer:(mlExplorerFilter:(),mlExplorerSwimlane:()))"`
    );
  });
});
