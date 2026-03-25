/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { License } from '@kbn/licensing-plugin/common/license';
import { ServiceMapEmbeddable } from './service_map_embeddable';
import { ApmEmbeddableContext } from '../embeddable_context';
import { mockApmPluginContextValue } from '../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import * as useServiceMapHook from '../../components/app/service_map/use_service_map';
import { LicenseContext } from '../../context/license/license_context';

const mockCore = mockApmPluginContextValue.core as Parameters<
  typeof ApmEmbeddableContext
>[0]['deps']['coreStart'];

const mockDeps = {
  coreStart: mockCore,
  coreSetup: mockCore,
  pluginsSetup: mockApmPluginContextValue.plugins,
  pluginsStart: mockApmPluginContextValue.corePlugins,
  config: { serviceMapEnabled: true },
  kibanaEnvironment: { isCloud: false },
  observabilityRuleTypeRegistry: {},
} as unknown as Parameters<typeof ApmEmbeddableContext>[0]['deps'];

const defaultProps = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  core: mockCore,
};

const platinumLicense = new License({
  signature: 'test',
  license: {
    expiryDateInMillis: 0,
    mode: 'platinum',
    status: 'active',
    type: 'platinum',
    uid: '1',
  },
});

function renderEmbeddable(
  extraProps: Partial<React.ComponentProps<typeof ServiceMapEmbeddable>> = {}
) {
  return render(
    <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-15m" rangeTo="now">
      <LicenseContext.Provider value={platinumLicense}>
        <ServiceMapEmbeddable {...defaultProps} {...extraProps} />
      </LicenseContext.Provider>
    </ApmEmbeddableContext>
  );
}

describe('ServiceMapEmbeddable', () => {
  const mockUseServiceMap = jest.spyOn(useServiceMapHook, 'useServiceMap');

  beforeEach(() => {
    jest.clearAllMocks();
    (mockCore.application.getUrlForApp as jest.Mock)?.mockImplementation(
      (appId: string, options?: { path?: string }) => `/basepath/app/${appId}${options?.path ?? ''}`
    );
    mockUseServiceMap.mockReturnValue({
      data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
      status: FETCH_STATUS.LOADING,
    });
  });

  it('renders loading state', () => {
    renderEmbeddable();
    expect(screen.getByTestId('apmServiceMapEmbeddable')).toBeInTheDocument();
    expect(document.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    mockUseServiceMap.mockReturnValue({
      data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
      status: FETCH_STATUS.SUCCESS,
    });
    renderEmbeddable();
    expect(screen.getByText(/No services available/)).toBeInTheDocument();
  });

  it('renders license prompt when license is not platinum', () => {
    const goldLicense = new License({
      signature: 'test',
      license: {
        expiryDateInMillis: 0,
        mode: 'gold',
        status: 'active',
        type: 'gold',
        uid: '1',
      },
    });
    mockUseServiceMap.mockReturnValue({
      data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
      status: FETCH_STATUS.SUCCESS,
    });
    render(
      <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-15m" rangeTo="now">
        <LicenseContext.Provider value={goldLicense}>
          <ServiceMapEmbeddable {...defaultProps} />
        </LicenseContext.Provider>
      </ApmEmbeddableContext>
    );
    expect(screen.getByText(/Platinum/)).toBeInTheDocument();
  });

  it('renders error state on generic failure', () => {
    mockUseServiceMap.mockReturnValue({
      data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
      status: FETCH_STATUS.FAILURE,
    });
    renderEmbeddable();
    expect(screen.getByText(/Unable to load service map/)).toBeInTheDocument();
    expect(screen.getByTestId('apmServiceMapEmbeddableError')).toBeInTheDocument();
  });

  it('renders map with view full map link when data is loaded', () => {
    mockUseServiceMap.mockReturnValue({
      data: {
        nodes: [
          {
            id: 'node-1',
            data: { id: 'node-1', label: 'service-a', isService: true as const },
            position: { x: 0, y: 0 },
            type: 'service',
          },
        ],
        edges: [],
        nodesCount: 1,
        tracesCount: 10,
      },
      status: FETCH_STATUS.SUCCESS,
    });
    renderEmbeddable();
    expect(screen.getByTestId('apmServiceMapEmbeddable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View full service map/i })).toBeInTheDocument();
  });
});
