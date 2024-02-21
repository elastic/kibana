/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderQuery } from '../../../management/hooks/test_utils';
import { useAssetCriticalityPrivileges } from './use_asset_criticality';

const mockFetchAssetCriticalityPrivileges = jest.fn().mockResolvedValue({});
jest.mock('../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchAssetCriticalityPrivileges: mockFetchAssetCriticalityPrivileges,
  }),
}));

const mockUseHasSecurityCapability = jest.fn().mockReturnValue(false);
jest.mock('../../../helper_hooks', () => ({
  useHasSecurityCapability: () => mockUseHasSecurityCapability(),
}));

const mockUseUiSettings = jest.fn().mockReturnValue([false]);
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    useUiSetting$: () => mockUseUiSettings(),
  };
});

describe('useAssetCriticality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call privileges API when hasEntityAnalyticsCapability is false', async () => {
    mockUseHasSecurityCapability.mockReturnValue(false);
    mockUseUiSettings.mockReturnValue([true]);

    await renderQuery(() => useAssetCriticalityPrivileges('test_entity_name'), 'isSuccess');

    expect(mockFetchAssetCriticalityPrivileges).not.toHaveBeenCalled();
  });

  it('calls privileges API when hasEntityAnalyticsCapability and UiSettings are enabled', async () => {
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseUiSettings.mockReturnValue([true]);

    await renderQuery(() => useAssetCriticalityPrivileges('test_entity_name'), 'isSuccess');

    expect(mockFetchAssetCriticalityPrivileges).toHaveBeenCalled();
  });

  it('does not call privileges API when UI Settings is disabled', async () => {
    mockUseHasSecurityCapability.mockReturnValue(true);
    mockUseUiSettings.mockReturnValue([false]);

    await renderQuery(() => useAssetCriticalityPrivileges('test_entity_name'), 'isSuccess');

    expect(mockFetchAssetCriticalityPrivileges).not.toHaveBeenCalled();
  });
});
