/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom-v5-compat';
import { BehaviorSubject } from 'rxjs';
import { License } from '@kbn/licensing-plugin/common/license';
import { ApmEmbeddableContext } from './embeddable_context';
import { mockApmPluginContextValue } from '../context/apm_plugin/mock_apm_plugin_context';
import { ApmPluginContext } from '../context/apm_plugin/apm_plugin_context';
import * as urlParamHelpers from '../context/url_params_context/helpers';
import * as createCallApmApiModule from '../services/rest/create_call_apm_api';

jest.mock('../context/time_range_metadata/time_range_metadata_context', () => ({
  TimeRangeMetadataContextProvider: ({
    children,
    start,
    end,
    kuery,
  }: {
    children: React.ReactNode;
    start: string;
    end: string;
    kuery: string;
  }) => (
    <div
      data-test-subj="time-range-metadata-provider"
      data-start={start}
      data-end={end}
      data-kuery={kuery}
    >
      {children}
    </div>
  ),
}));

jest.mock('../context/apm_index_settings/apm_index_settings_context', () => ({
  ApmIndexSettingsContextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="apm-index-settings-provider">{children}</div>
  ),
}));

const mockCore = mockApmPluginContextValue.core as Parameters<
  typeof ApmEmbeddableContext
>[0]['deps']['coreStart'];

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

const mockLicensing = {
  license$: new BehaviorSubject(platinumLicense),
};

const mockDeps = {
  coreStart: mockCore,
  coreSetup: mockCore,
  pluginsSetup: mockApmPluginContextValue.plugins,
  pluginsStart: {
    ...mockApmPluginContextValue.corePlugins,
    licensing: mockLicensing,
  },
  config: { serviceMapEnabled: true },
  kibanaEnvironment: { isCloud: false },
  observabilityRuleTypeRegistry: {},
} as unknown as Parameters<typeof ApmEmbeddableContext>[0]['deps'];

function ContextConsumer() {
  const context = useContext(ApmPluginContext);
  return (
    <div data-test-subj="context-consumer">
      <span data-test-subj="has-config">{context.config ? 'true' : 'false'}</span>
      <span data-test-subj="has-core">{context.core ? 'true' : 'false'}</span>
    </div>
  );
}

/** Probe that surfaces the in-memory router URL so we can assert what gets seeded. */
function LocationProbe() {
  const location = useLocation();
  return (
    <div
      data-test-subj="location-probe"
      data-path={location.pathname}
      data-search={location.search}
    />
  );
}

describe('ApmEmbeddableContext', () => {
  const mockGetDateRange = jest.spyOn(urlParamHelpers, 'getDateRange');
  const mockCreateCallApmApi = jest.spyOn(createCallApmApiModule, 'createCallApmApi');

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDateRange.mockReturnValue({
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-01-01T00:15:00.000Z',
    });
    mockCreateCallApmApi.mockImplementation(() => {});
  });

  it('renders children', () => {
    render(
      <ApmEmbeddableContext deps={mockDeps}>
        <div data-test-subj="child-content">Test Child</div>
      </ApmEmbeddableContext>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('provides ApmPluginContext with correct services', () => {
    render(
      <ApmEmbeddableContext deps={mockDeps}>
        <ContextConsumer />
      </ApmEmbeddableContext>
    );

    expect(screen.getByTestId('has-config')).toHaveTextContent('true');
    expect(screen.getByTestId('has-core')).toHaveTextContent('true');
  });

  it('calls createCallApmApi with coreStart', () => {
    render(
      <ApmEmbeddableContext deps={mockDeps}>
        <div>Test</div>
      </ApmEmbeddableContext>
    );

    expect(mockCreateCallApmApi).toHaveBeenCalledWith(mockDeps.coreStart);
  });

  describe('date range handling', () => {
    it('uses default values when rangeFrom and rangeTo are not provided', () => {
      render(
        <ApmEmbeddableContext deps={mockDeps}>
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      expect(mockGetDateRange).toHaveBeenCalledWith({
        rangeFrom: 'now-15m',
        rangeTo: 'now',
      });
    });

    it('uses provided rangeFrom and rangeTo values', () => {
      render(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-1h" rangeTo="now-30m">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      expect(mockGetDateRange).toHaveBeenCalledWith({
        rangeFrom: 'now-1h',
        rangeTo: 'now-30m',
      });
    });

    it('passes resolved date range to TimeRangeMetadataContextProvider', () => {
      mockGetDateRange.mockReturnValue({ start: 'resolved-start', end: 'resolved-end' });

      render(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-1h" rangeTo="now">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      const provider = screen.getByTestId('time-range-metadata-provider');
      expect(provider).toHaveAttribute('data-start', 'resolved-start');
      expect(provider).toHaveAttribute('data-end', 'resolved-end');
    });

    it('falls back to raw range values when date range resolution returns undefined', () => {
      mockGetDateRange.mockReturnValue({ start: undefined, end: undefined });

      render(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-2h" rangeTo="now-1h">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      const provider = screen.getByTestId('time-range-metadata-provider');
      expect(provider).toHaveAttribute('data-start', 'now-2h');
      expect(provider).toHaveAttribute('data-end', 'now-1h');
    });
  });

  describe('kuery handling', () => {
    it('uses empty string as default kuery', () => {
      render(
        <ApmEmbeddableContext deps={mockDeps}>
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      const provider = screen.getByTestId('time-range-metadata-provider');
      expect(provider).toHaveAttribute('data-kuery', '');
    });

    it('passes provided kuery to TimeRangeMetadataContextProvider', () => {
      render(
        <ApmEmbeddableContext deps={mockDeps} kuery="service.name: my-service">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      const provider = screen.getByTestId('time-range-metadata-provider');
      expect(provider).toHaveAttribute('data-kuery', 'service.name: my-service');
    });
  });

  describe('memoization', () => {
    it('recalculates date range when rangeFrom changes', () => {
      const { rerender } = render(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-15m" rangeTo="now">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      expect(mockGetDateRange).toHaveBeenCalledTimes(1);

      rerender(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-1h" rangeTo="now">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      expect(mockGetDateRange).toHaveBeenCalledTimes(2);
      expect(mockGetDateRange).toHaveBeenLastCalledWith({
        rangeFrom: 'now-1h',
        rangeTo: 'now',
      });
    });

    it('recalculates date range when rangeTo changes', () => {
      const { rerender } = render(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-15m" rangeTo="now">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      expect(mockGetDateRange).toHaveBeenCalledTimes(1);

      rerender(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-15m" rangeTo="now-5m">
          <div>Test</div>
        </ApmEmbeddableContext>
      );

      expect(mockGetDateRange).toHaveBeenCalledTimes(2);
      expect(mockGetDateRange).toHaveBeenLastCalledWith({
        rangeFrom: 'now-15m',
        rangeTo: 'now-5m',
      });
    });
  });

  describe('environment seeding into the in-memory router URL', () => {
    it('defaults to ENVIRONMENT_ALL when no environment prop is provided', () => {
      render(
        <ApmEmbeddableContext deps={mockDeps}>
          <LocationProbe />
        </ApmEmbeddableContext>
      );

      const search = screen.getByTestId('location-probe').getAttribute('data-search') ?? '';
      const params = new URLSearchParams(search);
      expect(params.get('environment')).toBeTruthy();
    });

    it('passes the provided environment through to the in-memory URL', () => {
      render(
        <ApmEmbeddableContext deps={mockDeps} environment="otel-demo">
          <LocationProbe />
        </ApmEmbeddableContext>
      );

      const search = screen.getByTestId('location-probe').getAttribute('data-search') ?? '';
      const params = new URLSearchParams(search);
      expect(params.get('environment')).toBe('otel-demo');
    });

    it('URL-encodes environment values that contain special characters', () => {
      render(
        <ApmEmbeddableContext deps={mockDeps} environment="my env / prod">
          <LocationProbe />
        </ApmEmbeddableContext>
      );

      const search = screen.getByTestId('location-probe').getAttribute('data-search') ?? '';
      const params = new URLSearchParams(search);
      expect(params.get('environment')).toBe('my env / prod');
    });

    it('updates the in-memory URL when the environment prop changes', () => {
      const { rerender } = render(
        <ApmEmbeddableContext deps={mockDeps} environment="staging">
          <LocationProbe />
        </ApmEmbeddableContext>
      );

      expect(
        new URLSearchParams(
          screen.getByTestId('location-probe').getAttribute('data-search') ?? ''
        ).get('environment')
      ).toBe('staging');

      rerender(
        <ApmEmbeddableContext deps={mockDeps} environment="production">
          <LocationProbe />
        </ApmEmbeddableContext>
      );

      expect(
        new URLSearchParams(
          screen.getByTestId('location-probe').getAttribute('data-search') ?? ''
        ).get('environment')
      ).toBe('production');
    });
  });

  describe('nested v6 router context', () => {
    it('renders without crashing when mounted inside a page that already has a v6 router context (CompatRouter)', () => {
      const outerHistory = createMemoryHistory();

      render(
        <Router history={outerHistory}>
          <ApmEmbeddableContext deps={mockDeps}>
            <div data-test-subj="nested-child">Nested Content</div>
          </ApmEmbeddableContext>
        </Router>
      );

      expect(screen.getByTestId('nested-child')).toBeInTheDocument();
      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });
  });
});
