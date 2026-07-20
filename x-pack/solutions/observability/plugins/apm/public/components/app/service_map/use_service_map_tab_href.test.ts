/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { fromQuery } from '../../shared/links/url_helpers';
import { useServiceMapTabHrefBuilder } from './use_service_map_tab_href';

const serviceMapQuery = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: 'production',
  kuery: 'service.name: "opbeans-node"',
  comparisonEnabled: false,
  offset: '15m',
  serviceGroup: '',
};

function createWrapper(pathname: string) {
  const history = createMemoryHistory({
    initialEntries: [{ pathname, search: fromQuery(serviceMapQuery) }],
  });

  return ({ children }: { children?: ReactNode }) =>
    React.createElement(MockApmPluginContextWrapper, { history }, children);
}

describe('useServiceMapTabHrefBuilder', () => {
  it('builds an overview-tab link and resets the map kuery', () => {
    const { result } = renderHook(() => useServiceMapTabHrefBuilder('overview'), {
      wrapper: createWrapper('/service-map'),
    });
    const href = result.current('opbeans-node');

    expect(href).toContain('/app/apm/services/opbeans-node/overview');
    const search = new URL(`http://x${href}`).searchParams;
    expect(search.get('kuery')).toBe('');
    expect(search.get('environment')).toBe('production');
  });

  it('builds a mobile-services overview-tab link on the mobile overview context', () => {
    const { result } = renderHook(() => useServiceMapTabHrefBuilder('overview'), {
      wrapper: createWrapper('/mobile-services/opbeans-rum/overview'),
    });
    const href = result.current('opbeans-rum');

    expect(href).toContain('/app/apm/mobile-services/opbeans-rum/overview');
    const search = new URL(`http://x${href}`).searchParams;
    expect(search.get('kuery')).toBe('');
  });

  it('builds a mobile-services overview-tab link on the mobile map context', () => {
    const { result } = renderHook(() => useServiceMapTabHrefBuilder('overview'), {
      wrapper: createWrapper('/mobile-services/opbeans-rum/service-map'),
    });
    const href = result.current('opbeans-rum');

    expect(href).toContain('/app/apm/mobile-services/opbeans-rum/overview');
    const search = new URL(`http://x${href}`).searchParams;
    expect(search.get('kuery')).toBe('');
  });
});
