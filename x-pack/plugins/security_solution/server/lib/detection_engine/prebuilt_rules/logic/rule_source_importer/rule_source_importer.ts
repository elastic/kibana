/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionApiRequestHandlerContext } from '../../../../../types';
import type { ConfigType } from '../../../../../config';
import type {
  RuleToImport,
  ValidatedRuleToImport,
} from '../../../../../../common/api/detection_engine';
import { calculateRuleSourceForImport } from '../../../rule_management/logic/import/calculate_rule_source_for_import';
import {
  isRuleToImport,
  type RuleFromImportStream,
} from '../../../rule_management/logic/import/utils';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import type { IPrebuiltRuleAssetsClient } from '../rule_assets/prebuilt_rule_assets_client';
import { ensureLatestRulesPackageInstalled } from '../ensure_latest_rules_package_installed';
import type { CalculatedRuleSource, IRuleSourceImporter, RuleSpecifier } from './types';
import { fetchAvailableRuleAssetIds, fetchMatchingAssets } from './utils';

/**
 *
 * This class contains utilities for assisting with the calculation of
 * `rule_source` during import. It ensures that the system contains the
 * necessary assets, and provides utilities for fetching information from them,
 * necessary for said calculation.
 */
export class RuleSourceImporter implements IRuleSourceImporter {
  private context: SecuritySolutionApiRequestHandlerContext;
  private config: ConfigType;
  private ruleAssetsClient: IPrebuiltRuleAssetsClient;
  private enabled: boolean;
  private latestPackagesInstalled: boolean = false;
  private matchingAssets: PrebuiltRuleAsset[] = [];
  private knownRules: RuleSpecifier[] = [];
  private availableRuleAssetIds: string[] = [];

  constructor({
    config,
    context,
    prebuiltRuleAssetsClient,
  }: {
    config: ConfigType;
    context: SecuritySolutionApiRequestHandlerContext;
    prebuiltRuleAssetsClient: IPrebuiltRuleAssetsClient;
  }) {
    this.ruleAssetsClient = prebuiltRuleAssetsClient;
    this.context = context;
    this.config = config;
    this.enabled = config.experimentalFeatures.prebuiltRulesCustomizationEnabled;
  }

  /**
   *
   * Prepares the importing of rules by ensuring the latest rules
   * package is installed and fetching the associated prebuilt rule assets.
   */
  public async setup({ rules }: { rules: RuleFromImportStream[] }): Promise<void> {
    if (!this.enabled) {
      return;
    }

    if (!this.latestPackagesInstalled) {
      await ensureLatestRulesPackageInstalled(this.ruleAssetsClient, this.config, this.context);
      this.latestPackagesInstalled = true;
    }

    this.knownRules = rules
      .filter(isRuleToImport)
      .map((rule) => ({ rule_id: rule.rule_id, version: rule.version }));

    try {
      this.validateSetupState();

      this.matchingAssets = await this.fetchMatchingAssets();
      this.availableRuleAssetIds = await this.fetchAvailableRuleAssetIds();
    } catch (e) {
      // If all incoming rules were errors, there's nothing to calculate
    }
  }

  public isPrebuiltRule(rule: RuleFromImportStream): boolean {
    if (!isRuleToImport(rule)) {
      return false;
    }
    this.validateRuleInput(rule);

    return this.availableRuleAssetIds.includes(rule.rule_id);
  }

  public calculateRuleSource(rule: ValidatedRuleToImport): CalculatedRuleSource {
    this.validateRuleInput(rule);

    return calculateRuleSourceForImport({
      rule,
      prebuiltRuleAssets: this.matchingAssets,
      installedRuleIds: this.availableRuleAssetIds,
    });
  }

  private async fetchMatchingAssets(): Promise<PrebuiltRuleAsset[]> {
    this.validateSetupState();

    return fetchMatchingAssets({
      rules: this.knownRules,
      ruleAssetsClient: this.ruleAssetsClient,
    });
  }

  private async fetchAvailableRuleAssetIds(): Promise<string[]> {
    this.validateSetupState();

    return fetchAvailableRuleAssetIds({
      rules: this.knownRules,
      ruleAssetsClient: this.ruleAssetsClient,
    });
  }

  /**
   * Runtime sanity checks to ensure no one's calling this stateful instance in the wrong way.
   *  */
  private validateSetupState() {
    if (!this.latestPackagesInstalled) {
      throw new Error('Expected rules package to be installed');
    }

    if (this.knownRules.length === 0) {
      throw new Error(
        'Expected rules to have been registered, but none were. Please call the setup() method with the relevant incoming rules.'
      );
    }
  }

  private validateRuleInput(rule: RuleToImport) {
    if (
      !this.knownRules.some(
        (knownRule) =>
          knownRule.rule_id === rule.rule_id &&
          (knownRule.version === rule.version || knownRule.version == null)
      )
    ) {
      throw new Error(`Rule ${rule.rule_id} was not registered during setup.`);
    }
  }
}

export const createRuleSourceImporter = ({
  config,
  context,
  prebuiltRuleAssetsClient,
}: {
  config: ConfigType;
  context: SecuritySolutionApiRequestHandlerContext;
  prebuiltRuleAssetsClient: IPrebuiltRuleAssetsClient;
}): RuleSourceImporter => {
  return new RuleSourceImporter({ config, context, prebuiltRuleAssetsClient });
};
