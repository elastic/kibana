/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { License } from '@kbn/licensing-plugin/common/license';
import { BehaviorSubject } from 'rxjs';
import { ServiceMapEmbeddable } from './service_map_embeddable';
import { ApmEmbeddableContext } from '../embeddable_context';
import { mockApmPluginContextValue } from '../../context/apm_plugin/mock_apm_plugin_context';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { SERVICE_MAP_TIMEOUT_ERROR } from '../../../common/service_map';
import * as useServiceMapHook from '../../components/app/service_map/use_service_map';
import * as urlParamHelpers from '../../context/url_params_context/helpers';
import { LicenseContext } from '../../context/license/license_context';

jest.mock('../../context/time_range_metadata/time_range_metadata_context', () => {
  const actual = jest.requireActual(
    '../../context/time_range_metadata/time_range_metadata_context'
  );
  return {
    ...actual,
    TimeRangeMetadataContextProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

jest.mock('../../context/apm_index_settings/apm_index_settings_context', () => ({
  ApmIndexSettingsContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockCore = mockApmPluginContextValue.core as Parameters<
  typeof ApmEmbeddableContext
>[0]['deps']['coreStart'];

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

function renderEmbeddable(
  extraProps: Partial<React.ComponentProps<typeof ServiceMapEmbeddable>> = {},
  options: {
    license?: License;
    deps?: Parameters<typeof ApmEmbeddableContext>[0]['deps'];
  } = {}
) {
  const license = Object.prototype.hasOwnProperty.call(options, 'license')
    ? options.license
    : platinumLicense;
  const deps = options.deps ?? mockDeps;

  return render(
    <ApmEmbeddableContext deps={deps} rangeFrom="now-15m" rangeTo="now">
      <LicenseContext.Provider value={license}>
        <ServiceMapEmbeddable {...defaultProps} {...extraProps} />
      </LicenseContext.Provider>
    </ApmEmbeddableContext>
  );
}

describe('ServiceMapEmbeddable', () => {
  const mockUseServiceMap = jest.spyOn(useServiceMapHook, 'useServiceMap');
  const mockGetDateRange = jest.spyOn(urlParamHelpers, 'getDateRange');

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDateRange.mockReturnValue({ start: 'resolved-start', end: 'resolved-end' });
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

  it('clears blocking error when license and config are valid', () => {
    const onBlockingError = jest.fn();
    mockUseServiceMap.mockReturnValue({
      data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
      status: FETCH_STATUS.LOADING,
    });
    renderEmbeddable({ onBlockingError });
    expect(onBlockingError).toHaveBeenCalledWith(undefined);
  });

  describe('when license is missing', () => {
    it('renders the loading state', () => {
      renderEmbeddable({}, { license: undefined });
      expect(screen.getByTestId('apmServiceMapEmbeddable')).toBeInTheDocument();
      expect(document.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });
  });

  describe('when no data is returned', () => {
    it('renders the empty state', () => {
      mockUseServiceMap.mockReturnValue({
        data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
        status: FETCH_STATUS.SUCCESS,
      });
      renderEmbeddable();
      expect(screen.getByText(/No services available/)).toBeInTheDocument();
    });
  });

  describe('when license is not platinum', () => {
    it('renders loading state while blocking error takes effect', () => {
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
      expect(screen.getByTestId('apmServiceMapEmbeddable')).toBeInTheDocument();
      expect(document.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });

    it('calls onBlockingError with license error', () => {
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
      const onBlockingError = jest.fn();
      mockUseServiceMap.mockReturnValue({
        data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
        status: FETCH_STATUS.SUCCESS,
      });
      render(
        <ApmEmbeddableContext deps={mockDeps} rangeFrom="now-15m" rangeTo="now">
          <LicenseContext.Provider value={goldLicense}>
            <ServiceMapEmbeddable {...defaultProps} onBlockingError={onBlockingError} />
          </LicenseContext.Provider>
        </ApmEmbeddableContext>
      );
      expect(onBlockingError).toHaveBeenCalledWith(expect.any(Error));
      expect(onBlockingError.mock.calls[0][0].message).toMatch(/Platinum/);
    });
  });

  describe('when service map is not enabled', () => {
    it('renders loading state while blocking error takes effect', () => {
      mockUseServiceMap.mockReturnValue({
        data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
        status: FETCH_STATUS.SUCCESS,
      });
      renderEmbeddable(
        {},
        {
          deps: {
            ...mockDeps,
            config: {
              ...mockDeps.config,
              serviceMapEnabled: false,
            },
          },
        }
      );
      expect(screen.getByTestId('apmServiceMapEmbeddable')).toBeInTheDocument();
      expect(document.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });

    it('calls onBlockingError with disabled error', () => {
      const onBlockingError = jest.fn();
      mockUseServiceMap.mockReturnValue({
        data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
        status: FETCH_STATUS.SUCCESS,
      });
      render(
        <ApmEmbeddableContext
          deps={{
            ...mockDeps,
            config: { ...mockDeps.config, serviceMapEnabled: false },
          }}
          rangeFrom="now-15m"
          rangeTo="now"
        >
          <LicenseContext.Provider value={platinumLicense}>
            <ServiceMapEmbeddable {...defaultProps} onBlockingError={onBlockingError} />
          </LicenseContext.Provider>
        </ApmEmbeddableContext>
      );
      expect(onBlockingError).toHaveBeenCalledWith(expect.any(Error));
      expect(onBlockingError.mock.calls[0][0].message).toMatch(/disabled/i);
    });
  });

  describe('when fetch status fails', () => {
    it('renders the error state', () => {
      mockUseServiceMap.mockReturnValue({
        data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
        status: FETCH_STATUS.FAILURE,
      });
      renderEmbeddable();
      expect(screen.getByText(/Unable to load service map/)).toBeInTheDocument();
      expect(screen.getByTestId('apmServiceMapEmbeddableError')).toBeInTheDocument();
    });

    describe('when timeout error is returned', () => {
      it('renders the timeout prompt', () => {
        const timeoutError = {
          name: 'HttpFetchError',
          message: 'Request failed',
          request: new Request('http://localhost/internal/apm/service-map'),
          body: {
            statusCode: 500,
            message: SERVICE_MAP_TIMEOUT_ERROR,
          },
        } as IHttpFetchError<ResponseErrorBody>;

        mockUseServiceMap.mockReturnValue({
          data: { nodes: [], edges: [], nodesCount: 0, tracesCount: 0 },
          status: FETCH_STATUS.FAILURE,
          error: timeoutError,
        });

        renderEmbeddable();

        expect(screen.getByText(/Service map timeout/)).toBeInTheDocument();
      });
    });
  });

  describe('when data is loaded', () => {
    beforeEach(() => {
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
    });

    it('renders the map with a link to view the full map', () => {
      renderEmbeddable();
      expect(screen.getByTestId('apmServiceMapEmbeddable')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View full service map/i })).toBeInTheDocument();
    });

    it('hides the fit view button when embedded', () => {
      renderEmbeddable();
      expect(screen.queryByTestId('serviceMapFitViewButton')).not.toBeInTheDocument();
    });

    it('falls back to raw range values when date range is unresolved', () => {
      mockGetDateRange.mockReturnValue({ start: undefined, end: undefined });
      renderEmbeddable({ rangeFrom: 'now-2h', rangeTo: 'now-1h' });

      expect(mockUseServiceMap).toHaveBeenCalledWith(
        expect.objectContaining({
          start: 'now-2h',
          end: 'now-1h',
        })
      );
    });
  });
});
