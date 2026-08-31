/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import { RedirectFocusedServiceMapToGlobal } from './redirect_focused_service_map_to_global';

const mockQuery = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: 'production',
  kuery: 'service.name: "opbeans-java"',
  comparisonEnabled: true,
  offset: '1d',
  serviceGroup: '',
};

jest.mock('../../../hooks/use_apm_params', () => ({
  useAnyOfApmParams: () => ({
    path: { serviceName: 'opbeans-java' },
    query: mockQuery,
  }),
}));

describe('RedirectFocusedServiceMapToGlobal', () => {
  it('redirects to the global service map with service.name controlSelections', () => {
    let locationSearch = '';
    let locationPathname = '';

    render(
      <MemoryRouter initialEntries={['/services/opbeans-java/service-map']}>
        <Route path="/services/:serviceName/service-map">
          <RedirectFocusedServiceMapToGlobal />
        </Route>
        <Route
          path="/service-map"
          render={({ location }) => {
            locationPathname = location.pathname;
            locationSearch = location.search;
            return null;
          }}
        />
      </MemoryRouter>
    );

    expect(locationPathname).toBe('/service-map');
    expect(locationSearch).toContain('rangeFrom=now-15m');
    expect(locationSearch).toContain('rangeTo=now');
    expect(locationSearch).toContain('environment=production');
    expect(locationSearch).toContain('comparisonEnabled=true');
    expect(locationSearch).toContain('offset=1d');
    expect(locationSearch).toContain('controlSelections');
    expect(locationSearch).toContain('opbeans-java');
    expect(locationSearch).not.toContain('kuery=');
  });
});
