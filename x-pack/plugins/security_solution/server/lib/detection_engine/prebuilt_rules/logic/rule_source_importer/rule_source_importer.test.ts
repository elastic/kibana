/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidatedRuleToImport } from '../../../../../../common/api/detection_engine';
import { createPrebuiltRuleAssetsClient as createPrebuiltRuleAssetsClientMock } from '../rule_assets/__mocks__/prebuilt_rule_assets_client';
import type { RuleFromImportStream } from '../../../rule_management/logic/import/utils';
import { configMock, createMockConfig, requestContextMock } from '../../../routes/__mocks__';
import { createRuleSourceImporter } from './rule_source_importer';
import * as calculateRuleSourceModule from '../../../rule_management/logic/import/calculate_rule_source_for_import';
import { getPrebuiltRuleMock } from '../../mocks';

describe('ruleSourceImporter', () => {
  let ruleAssetsClientMock: ReturnType<typeof createPrebuiltRuleAssetsClientMock>;
  let config: ReturnType<typeof createMockConfig>;
  let context: ReturnType<typeof requestContextMock.create>['securitySolution'];
  let ruleToImport: RuleFromImportStream;
  let subject: ReturnType<typeof createRuleSourceImporter>;

  beforeEach(() => {
    config = createMockConfig();
    config = configMock.withExperimentalFeature(config, 'prebuiltRulesCustomizationEnabled');
    context = requestContextMock.create().securitySolution;
    ruleAssetsClientMock = createPrebuiltRuleAssetsClientMock();
    ruleAssetsClientMock.fetchLatestAssets.mockResolvedValue([{}]);
    ruleToImport = { rule_id: 'rule-1', version: 1 } as RuleFromImportStream;

    subject = createRuleSourceImporter({
      context,
      config,
      prebuiltRuleAssetsClient: ruleAssetsClientMock,
    });
  });

  it('should initialize correctly', () => {
    expect(subject).toBeDefined();

    expect(() => subject.isPrebuiltRule(ruleToImport)).toThrowErrorMatchingInlineSnapshot(
      `"Rule rule-1 was not registered during setup."`
    );
  });

  describe('#setup()', () => {
    it('does nothing if feature flag is disabled', async () => {
      const disabledSubject = createRuleSourceImporter({
        config: createMockConfig(),
        context,
        prebuiltRuleAssetsClient: ruleAssetsClientMock,
      });
      await disabledSubject.setup({ rules: [ruleToImport] });

      expect(ruleAssetsClientMock.fetchLatestAssets).toHaveBeenCalledTimes(0);
    });

    it('fetches the rules package on the initial call', async () => {
      await subject.setup({ rules: [] });

      expect(ruleAssetsClientMock.fetchLatestAssets).toHaveBeenCalledTimes(1);
    });

    it('does not fetch the rules package on subsequent calls', async () => {
      await subject.setup({ rules: [] });
      await subject.setup({ rules: [] });
      await subject.setup({ rules: [] });

      expect(ruleAssetsClientMock.fetchLatestAssets).toHaveBeenCalledTimes(1);
    });
  });

  describe('#isPrebuiltRule()', () => {
    beforeEach(() => {});

    it("returns false if the rule's rule_id doesn't match an available rule asset", async () => {
      ruleAssetsClientMock.fetchLatestAssetsByRuleId.mockResolvedValue([]);
      await subject.setup({ rules: [ruleToImport] });

      expect(subject.isPrebuiltRule(ruleToImport)).toBe(false);
    });

    it("returns true if the rule's rule_id matches an available rule asset", async () => {
      ruleAssetsClientMock.fetchLatestAssetsByRuleId.mockResolvedValue([ruleToImport]);
      await subject.setup({ rules: [ruleToImport] });

      expect(subject.isPrebuiltRule(ruleToImport)).toBe(true);
    });

    it('throws an error if the rule is not known to the calculator', async () => {
      ruleAssetsClientMock.fetchLatestAssetsByRuleId.mockResolvedValue([ruleToImport]);
      await subject.setup({ rules: [ruleToImport] });

      expect(() =>
        subject.isPrebuiltRule({ rule_id: 'other-rule' } as RuleFromImportStream)
      ).toThrowErrorMatchingInlineSnapshot(`"Rule other-rule was not registered during setup."`);
    });

    it('throws an error if the calculator is not set up', () => {
      expect(() => subject.isPrebuiltRule(ruleToImport)).toThrowErrorMatchingInlineSnapshot(
        `"Rule rule-1 was not registered during setup."`
      );
    });
  });

  describe('#calculateRuleSource()', () => {
    let rule: ValidatedRuleToImport;

    beforeEach(() => {
      rule = { rule_id: 'validated-rule', version: 1 } as ValidatedRuleToImport;
    });

    it('invokes calculateRuleSourceForImport with the correct arguments', async () => {
      ruleAssetsClientMock.fetchAssetsByVersion.mockResolvedValue([
        getPrebuiltRuleMock({ rule_id: 'rule-1' }),
      ]);
      ruleAssetsClientMock.fetchLatestAssetsByRuleId.mockResolvedValue([
        getPrebuiltRuleMock({ rule_id: 'rule-2' }),
      ]);
      const calculatorSpy = jest
        .spyOn(calculateRuleSourceModule, 'calculateRuleSourceForImport')
        .mockReturnValue({ ruleSource: { type: 'internal' }, immutable: false });

      await subject.setup({ rules: [rule] });
      await subject.calculateRuleSource(rule);

      expect(calculatorSpy).toHaveBeenCalledTimes(1);
      expect(calculatorSpy).toHaveBeenCalledWith({
        rule,
        prebuiltRuleAssets: [expect.objectContaining({ rule_id: 'rule-1' })],
        installedRuleIds: ['rule-2'],
      });
    });

    it('throws an error if the rule is not known to the calculator', async () => {
      ruleAssetsClientMock.fetchLatestAssetsByRuleId.mockResolvedValue([ruleToImport]);
      await subject.setup({ rules: [ruleToImport] });

      expect(() => subject.calculateRuleSource(rule)).toThrowErrorMatchingInlineSnapshot(
        `"Rule validated-rule was not registered during setup."`
      );
    });

    it('throws an error if the calculator is not set up', async () => {
      expect(() => subject.calculateRuleSource(rule)).toThrowErrorMatchingInlineSnapshot(
        `"Rule validated-rule was not registered during setup."`
      );
    });
  });
});
