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
import { PrebuiltRulesImporter } from './prebuilt_rules_importer';

jest.mock('./ensure_latest_rules_package_installed');

let mockPrebuiltRuleAssetsClient: ReturnType<typeof createPrebuiltRuleAssetsClientMock>;

jest.mock('./rule_assets/prebuilt_rule_assets_client', () => ({
  createPrebuiltRuleAssetsClient: () => mockPrebuiltRuleAssetsClient,
}));

describe('PrebuiltRulesImporter', () => {
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
    const importer = new PrebuiltRulesImporter({ config, context, savedObjectsClient });

    expect(importer).toBeDefined();
    expect(importer.enabled).toBe(true);
    expect(importer.latestPackagesInstalled).toBe(false);
  });

  describe('setup', () => {
    it('should not call ensureLatestRulesPackageInstalled if disabled', async () => {
      config = createMockConfig();
      const importer = new PrebuiltRulesImporter({ config, context, savedObjectsClient });

      await importer.setup();

      expect(ensureLatestRulesPackageInstalled).not.toHaveBeenCalled();
      expect(importer.latestPackagesInstalled).toBe(false);
    });

    it('should call ensureLatestRulesPackageInstalled if enabled', async () => {
      const importer = new PrebuiltRulesImporter({ config, context, savedObjectsClient });

      await importer.setup();

      expect(ensureLatestRulesPackageInstalled).toHaveBeenCalledWith(
        mockPrebuiltRuleAssetsClient,
        config,
        context
      );
      expect(importer.latestPackagesInstalled).toBe(true);
    });
  });

  describe('fetchPrebuiltRuleAssets', () => {
    it('should return an empty array if disabled', async () => {
      config = createMockConfig();
      const importer = new PrebuiltRulesImporter({ config, context, savedObjectsClient });

      const result = await importer.fetchPrebuiltRuleAssets({ rules: [] });

      expect(result).toEqual([]);
    });

    it('should throw an error if latestPackagesInstalled is false', async () => {
      const importer = new PrebuiltRulesImporter({ config, context, savedObjectsClient });

      await expect(importer.fetchPrebuiltRuleAssets({ rules: [] })).rejects.toThrow(
        'Prebuilt rule assets cannot be fetched until the latest rules package is installed. Call setup() on this object first.'
      );
    });

    it('should fetch prebuilt rule assets correctly if latestPackagesInstalled is true', async () => {
      const importer = new PrebuiltRulesImporter({ config, context, savedObjectsClient });
      importer.latestPackagesInstalled = true;

      const rules = [
        { rule_id: 'rule-1', version: 1 },
        { rule_id: 'rule-2', version: 2 },
        new Error('Invalid rule'),
      ] as Array<RuleToImport | Error>;

      await importer.fetchPrebuiltRuleAssets({ rules });

      expect(mockPrebuiltRuleAssetsClient.fetchAssetsByVersion).toHaveBeenCalledWith([
        { rule_id: 'rule-1', version: 1 },
        { rule_id: 'rule-2', version: 2 },
      ]);
    });
  });
});
