/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderMutation,
  renderQuery,
  renderWrappedHook,
} from '../../../management/hooks/test_utils';
import type { Entity } from './use_asset_criticality';
import { useAssetCriticalityPrivileges, useAssetCriticalityData } from './use_asset_criticality';

const mockFetchAssetCriticalityPrivileges = jest.fn().mockResolvedValue({});
const mockFetchAssetCriticality = jest.fn().mockResolvedValue({});
const mockDeleteAssetCriticality = jest.fn().mockResolvedValue({});
const mockCreateAssetCriticality = jest.fn().mockResolvedValue({});
jest.mock('../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({
    fetchAssetCriticalityPrivileges: mockFetchAssetCriticalityPrivileges,
    fetchAssetCriticality: mockFetchAssetCriticality,
    deleteAssetCriticality: mockDeleteAssetCriticality,
    createAssetCriticality: mockCreateAssetCriticality,
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

  describe('useAssetCriticalityPrivileges', () => {
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
  });

  describe('useAssetCriticalityData', () => {
    it('calls delete api when the mutation is called with unassigned criticality level', async () => {
      mockFetchAssetCriticalityPrivileges.mockResolvedValue({ has_all_required: true });
      mockDeleteAssetCriticality.mockResolvedValue({});
      mockCreateAssetCriticality.mockResolvedValue({});
      const entity: Entity = { name: 'test_entity_name', type: 'host' };

      const { mutation } = await renderWrappedHook(() => useAssetCriticalityData({ entity }));

      await renderMutation(async () =>
        mutation.mutate({
          idField: 'test_entity_type.name',
          idValue: 'test_entity_name',
          criticalityLevel: 'unassigned',
        })
      );

      expect(mockDeleteAssetCriticality).toHaveBeenCalled();
    });

    it('calls create api when the mutation is called with assigned criticality level', async () => {
      mockFetchAssetCriticalityPrivileges.mockResolvedValue({ has_all_required: true });
      mockDeleteAssetCriticality.mockResolvedValue({});
      mockCreateAssetCriticality.mockResolvedValue({});
      const entity: Entity = { name: 'test_entity_name', type: 'host' };

      const { mutation } = await renderWrappedHook(() => useAssetCriticalityData({ entity }));

      await renderMutation(async () =>
        mutation.mutate({
          idField: 'test_entity_type.name',
          idValue: 'test_entity_name',
          criticalityLevel: 'critical',
        })
      );

      expect(mockCreateAssetCriticality).toHaveBeenCalled();
    });
  });
});
