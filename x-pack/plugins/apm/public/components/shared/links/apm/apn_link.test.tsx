/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../../utils/test_helpers';
import { APMLink } from './apm_link';

describe('APMLink', () => {
  test('APMLink should produce the correct URL', async () => {
    const href = await getRenderedHref(
      () => <APMLink path="/some/path" query={{ transactionId: 'blah' }} />,
      {
        search:
          '?rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/apm/some/path?rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0&transactionId=blah"`
    );
  });

  test('APMLink should retain current kuery value if it exists', async () => {
    const href = await getRenderedHref(
      () => <APMLink path="/some/path" query={{ transactionId: 'blah' }} />,
      {
        search:
          '?kuery=host.hostname~20~3A~20~22fakehostname~22&rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/apm/some/path?kuery=host.hostname~20~3A~20~22fakehostname~22&rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0&transactionId=blah"`
    );
  });

  test('APMLink should overwrite current kuery value if new kuery value is provided', async () => {
    const href = await getRenderedHref(
      () => (
        <APMLink
          path="/some/path"
          query={{ kuery: 'host.os~20~3A~20~22linux~22' }}
        />
      ),
      {
        search:
          '?kuery=host.hostname~20~3A~20~22fakehostname~22&rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0',
      } as Location
    );

    expect(href).toMatchInlineSnapshot(
      `"/basepath/app/apm/some/path?kuery=host.os~20~3A~20~22linux~22&rangeFrom=now-5h&rangeTo=now-2h&refreshPaused=true&refreshInterval=0"`
    );
  });
});
