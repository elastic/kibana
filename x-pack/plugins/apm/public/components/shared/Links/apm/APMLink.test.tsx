/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React, { ReactNode } from 'react';
import { getRenderedHref } from '../../../../utils/testHelpers';
import { useAPMHref, APMLink } from './APMLink';
import { renderHook } from '@testing-library/react-hooks';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';
import { createMemoryHistory } from 'history';
import { LocationContext } from '../../../../context/LocationContext';

describe('useAPMHref', () => {
  it('returns the APM url', () => {
    const history = createMemoryHistory();
    const { location } = history;

    function Wrapper({ children }: { children?: ReactNode }) {
      return (
        <LocationContext.Provider value={location}>
          <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
        </LocationContext.Provider>
      );
    }

    const { result } = renderHook(
      () =>
        useAPMHref({
          path: '/test',
          currentSearch: '?kuery=x:y',
          query: { traceId: '1' },
        }),
      {
        wrapper: Wrapper,
      }
    );

    expect(result.current).toEqual(
      '/basepath/app/apm/test?kuery=x:y&traceId=1'
    );
  });
});

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
