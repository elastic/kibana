/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { useTabs } from './use_tabs';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';

const KibanaReactContext = createKibanaReactContext({
  metricsDataAccess: {
    HostMetricsTable: () => 'Host metrics table',
    ContainerMetricsTable: () => 'Container metrics table',
    PodMetricsTable: () => 'Pods metrics table',
  },
} as unknown as Partial<CoreStart>);

function wrapper({ children }: { children: ReactNode }) {
  return <KibanaReactContext.Provider>{children}</KibanaReactContext.Provider>;
}

describe('useTabs', () => {
  it('returns all tabs when container ids, pod names and host names are present', () => {
    const params = {
      containerIds: ['apple'],
      podNames: ['orange'],
      hostNames: ['banana'],
      start: '2022-05-18T11:43:23.367Z',
      end: '2022-05-18T11:58:23.367Z',
    };

    const { result } = renderHook(() => useTabs(params), { wrapper });

    const expectedTabs = [
      { id: 'containers', name: 'Containers', content: 'Container metrics table' },
      { id: 'pods', name: 'Pods', content: 'Pods metrics table' },
      { id: 'hosts', name: 'Hosts', content: 'Host metrics table' },
    ];

    expect(result.current).toHaveLength(expectedTabs.length);

    expectedTabs.forEach(({ id, name, content }, index) => {
      const currentTab = result.current[index];
      expect(currentTab.id).toBe(id);
      expect(currentTab.name).toBe(name);

      render(<div>{currentTab.content}</div>);
      expect(screen.getByText(content)).toBeInTheDocument();
    });
  });

  it('returns only host tab when no container ids and pod names are present', () => {
    const params = {
      containerIds: [],
      podNames: [],
      hostNames: ['banana'],
      start: '2022-05-18T11:43:23.367Z',
      end: '2022-05-18T11:58:23.367Z',
    };

    const { result } = renderHook(() => useTabs(params), { wrapper });

    expect(result.current).toHaveLength(1);
    const hostTab = result.current[0];

    expect(hostTab.id).toBe('hosts');
    expect(hostTab.name).toBe('Hosts');

    render(<div>{hostTab.content}</div>);
    expect(screen.getByText('Host metrics table')).toBeInTheDocument();
  });

  it('returns default host tab when no ids or names are present', () => {
    const params = {
      containerIds: [],
      podNames: [],
      hostNames: [],
      start: '2022-05-18T11:43:23.367Z',
      end: '2022-05-18T11:58:23.367Z',
    };

    const { result } = renderHook(() => useTabs(params), { wrapper });

    expect(result.current).toHaveLength(1);
    const hostTab = result.current[0];

    expect(hostTab.id).toBe('hosts');
    expect(hostTab.name).toBe('Hosts');

    render(<div>{hostTab.content}</div>);
    expect(screen.getByText('Host metrics table')).toBeInTheDocument();
  });
});
