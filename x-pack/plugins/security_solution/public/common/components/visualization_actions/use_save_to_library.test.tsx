/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useSaveToLibrary } from './use_save_to_library';
import { useKibana } from '../../lib/kibana';
import { useRedirectToDashboardFromLens } from './use_redirect_to_dashboard_from_lens';
import { useGetSecuritySolutionUrl } from '../link_to';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';

jest.mock('../../lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_redirect_to_dashboard_from_lens', () => ({
  useRedirectToDashboardFromLens: jest.fn(),
}));

jest.mock('../link_to', () => ({
  useRedirectToDashboardFromLens: jest.fn(),
  useGetSecuritySolutionUrl: jest.fn(),
}));

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(),
}));

describe('useSaveToLibrary hook', () => {
  const mockStartServices = {
    application: { capabilities: { visualize: { save: true } } },
    lens: { SaveModalComponent: jest.fn() },
  };

  const mockGetSecuritySolutionUrl = jest.fn();
  const mockRedirectTo = jest.fn();
  const mockGetEditOrCreateDashboardPath = jest.fn().mockReturnValue('mockDashboardPath');

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({ services: mockStartServices });
    (useRedirectToDashboardFromLens as jest.Mock).mockReturnValue({
      redirectTo: mockRedirectTo,
      getEditOrCreateDashboardPath: mockGetEditOrCreateDashboardPath,
    });
    (useGetSecuritySolutionUrl as jest.Mock).mockReturnValue(mockGetSecuritySolutionUrl);
    (toMountPoint as jest.Mock).mockImplementation(() => jest.fn());
  });

  it('should open the save visualization flyout when openSaveVisualizationFlyout is called', () => {
    const mockAttributes = kpiHostMetricLensAttributes;

    const { result } = renderHook(() =>
      useSaveToLibrary({ attributes: kpiHostMetricLensAttributes })
    );

    act(() => {
      result.current.openSaveVisualizationFlyout();
    });

    expect(toMountPoint).toHaveBeenCalled();
  });

  it('should disable visualizations if user cannot save', () => {
    const noSaveCapabilities = {
      ...mockStartServices,
      application: { capabilities: { visualize: { save: false } } },
    };
    (useKibana as jest.Mock).mockReturnValue({ services: noSaveCapabilities });

    const { result: result1 } = renderHook(() =>
      useSaveToLibrary({ attributes: kpiHostMetricLensAttributes })
    );
    expect(result1.current.disableVisualizations).toBe(true);
  });

  it('should disable visualizations if attributes are missing', () => {
    const noSaveCapabilities = {
      ...mockStartServices,
      application: { capabilities: { visualize: { save: false } } },
    };

    (useKibana as jest.Mock).mockReturnValue({ services: mockStartServices });
    const { result: result2 } = renderHook(() => useSaveToLibrary({ attributes: null }));
    expect(result2.current.disableVisualizations).toBe(true);
  });

  it('should enable visualizations if user can save and attributes are present', () => {
    const { result } = renderHook(() =>
      useSaveToLibrary({ attributes: kpiHostMetricLensAttributes })
    );
    expect(result.current.disableVisualizations).toBe(false);
  });
});
