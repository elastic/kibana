/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { RuleToImport } from '../../../../../common/api/detection_engine';
import { createPrebuiltRuleAssetsClient as createPrebuiltRuleAssetsClientMock } from './rule_assets/__mocks__/prebuilt_rule_assets_client';
import { ensureLatestRulesPackageInstalled } from './ensure_latest_rules_package_installed';
import { configMock, createMockConfig, requestContextMock } from '../../routes/__mocks__';
import { PrebuiltRulesImportHelper } from './prebuilt_rules_import_helper';

jest.mock('./ensure_latest_rules_package_installed');

let mockPrebuiltRuleAssetsClient: ReturnType<typeof createPrebuiltRuleAssetsClientMock>;

jest.mock('./rule_assets/prebuilt_rule_assets_client', () => ({
  createPrebuiltRuleAssetsClient: () => mockPrebuiltRuleAssetsClient,
}));

describe('PrebuiltRulesImportHelper', () => {
  let config: ReturnType<typeof createMockConfig>;
  let context: ReturnType<typeof requestContextMock.create>['securitySolution'];
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    config = createMockConfig();
    config = configMock.withExperimentalFeature(config, 'prebuiltRulesCustomizationEnabled');
    context = requestContextMock.create().securitySolution;
    savedObjectsClient = savedObjectsClientMock.create();
    mockPrebuiltRuleAssetsClient = createPrebuiltRuleAssetsClientMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize correctly', () => {
    const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });

    expect(importer).toBeDefined();
    expect(importer.enabled).toBe(true);
    expect(importer.latestPackagesInstalled).toBe(false);
  });

  describe('setup', () => {
    it('should not call ensureLatestRulesPackageInstalled if disabled', async () => {
      config = createMockConfig();
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });

      await importer.setup();

      expect(ensureLatestRulesPackageInstalled).not.toHaveBeenCalled();
      expect(importer.latestPackagesInstalled).toBe(false);
    });

    it('should call ensureLatestRulesPackageInstalled if enabled', async () => {
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });

      await importer.setup();

      expect(ensureLatestRulesPackageInstalled).toHaveBeenCalledWith(
        mockPrebuiltRuleAssetsClient,
        config,
        context
      );
      expect(importer.latestPackagesInstalled).toBe(true);
    });
  });

  describe('fetchMatchingAssets', () => {
    it('should return an empty array if disabled', async () => {
      config = createMockConfig();
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });

      const result = await importer.fetchMatchingAssets({ rules: [] });

      expect(result).toEqual([]);
    });

    it('should throw an error if latestPackagesInstalled is false', async () => {
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });

      await expect(importer.fetchMatchingAssets({ rules: [] })).rejects.toThrow(
        'Prebuilt rule assets cannot be fetched until the latest rules package is installed. Call setup() on this object first.'
      );
    });

    it('should fetch prebuilt rule assets correctly if latestPackagesInstalled is true', async () => {
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });
      importer.latestPackagesInstalled = true;

      const rules = [
        { rule_id: 'rule-1', version: 1 },
        { rule_id: 'rule-2', version: 2 },
        new Error('Invalid rule'),
      ] as Array<RuleToImport | Error>;

      await importer.fetchMatchingAssets({ rules });

      expect(mockPrebuiltRuleAssetsClient.fetchAssetsByVersion).toHaveBeenCalledWith([
        { rule_id: 'rule-1', version: 1 },
        { rule_id: 'rule-2', version: 2 },
      ]);
    });
  });

  describe('fetchAssetRuleIds', () => {
    it('returns an empty array if the importer is not enabled', async () => {
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });
      importer.enabled = false;

      const result = await importer.fetchAssetRuleIds({ rules: [] });

      expect(result).toEqual([]);
    });

    it('throws an error if the latest packages are not installed', async () => {
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });
      importer.latestPackagesInstalled = false;

      await expect(importer.fetchAssetRuleIds({ rules: [] })).rejects.toThrow(
        'Installed rule IDs cannot be fetched until the latest rules package is installed. Call setup() on this object first.'
      );
    });

    it('fetches and return the rule IDs of installed prebuilt rules', async () => {
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });
      importer.latestPackagesInstalled = true;
      const rules = [
        { rule_id: 'rule-1', version: 1 },
        { rule_id: 'rule-2', version: 1 },
        new Error('Invalid rule'),
      ] as Array<RuleToImport | Error>;
      const installedRuleAssets = [{ rule_id: 'rule-1' }, { rule_id: 'rule-2' }];

      (mockPrebuiltRuleAssetsClient.fetchLatestAssetsByRuleId as jest.Mock).mockResolvedValue(
        installedRuleAssets
      );

      const result = await importer.fetchAssetRuleIds({ rules });

      expect(mockPrebuiltRuleAssetsClient.fetchLatestAssetsByRuleId).toHaveBeenCalledWith([
        'rule-1',
        'rule-2',
      ]);
      expect(result).toEqual(['rule-1', 'rule-2']);
    });

    it('handles rules that are instances of Error', async () => {
      const importer = new PrebuiltRulesImportHelper({ config, context, savedObjectsClient });
      importer.latestPackagesInstalled = true;
      const rules = [new Error('Invalid rule')];

      (mockPrebuiltRuleAssetsClient.fetchLatestAssetsByRuleId as jest.Mock).mockResolvedValue([]);

      const result = await importer.fetchAssetRuleIds({ rules });

      expect(mockPrebuiltRuleAssetsClient.fetchLatestAssetsByRuleId).toHaveBeenCalledWith([]);
      expect(result).toEqual([]);
    });
  });
});
