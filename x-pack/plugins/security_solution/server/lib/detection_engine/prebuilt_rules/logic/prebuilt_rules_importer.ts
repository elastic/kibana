/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RuleToImport } from '../../../../../common/api/detection_engine';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../types';
import type { ConfigType } from '../../../../config';
import type { PrebuiltRuleAsset } from '../model/rule_assets/prebuilt_rule_asset';
import { createPrebuiltRuleAssetsClient } from './rule_assets/prebuilt_rule_assets_client';
import { ensureLatestRulesPackageInstalled } from './ensure_latest_rules_package_installed';

type MaybeRule = RuleToImport | Error;
export interface IPrebuiltRulesImporter {
  setup: () => Promise<void>;
  fetchPrebuiltRuleAssets: ({ rules }: { rules: MaybeRule[] }) => Promise<PrebuiltRuleAsset[]>;
}

/**
 *
 * This object contains logic necessary to import prebuilt rules into the system.
 */
export class PrebuiltRulesImporter implements IPrebuiltRulesImporter {
  private context: SecuritySolutionApiRequestHandlerContext;
  private config: ConfigType;
  private ruleAssetsClient: ReturnType<typeof createPrebuiltRuleAssetsClient>;
  public enabled: boolean;
  public latestPackagesInstalled: boolean = false;

  constructor({
    config,
    savedObjectsClient,
    context,
  }: {
    config: ConfigType;
    context: SecuritySolutionApiRequestHandlerContext;
    savedObjectsClient: SavedObjectsClientContract;
  }) {
    this.ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
    this.context = context;
    this.config = config;
    this.enabled = config.experimentalFeatures.prebuiltRulesCustomizationEnabled;
  }

  /**
   *
   * Prepares the system to import prebuilt rules by ensuring the latest rules
   * package is installed.
   */
  public async setup() {
    if (!this.enabled) {
      return;
    }

    await ensureLatestRulesPackageInstalled(this.ruleAssetsClient, this.config, this.context);
    this.latestPackagesInstalled = true;
  }

  /**
   * Retrieves the prebuilt rule assets for the specified rules being imported. If
   * @param rules - The rules to be imported
   *
   * @returns The prebuilt rule assets corresponding to the specified prebuilt
   * rules, which are used to determine how to import those rules (create vs. update, etc.).
   */
  public async fetchPrebuiltRuleAssets({
    rules,
  }: {
    rules: MaybeRule[];
  }): Promise<PrebuiltRuleAsset[]> {
    if (!this.enabled) {
      return [];
    }

    if (!this.latestPackagesInstalled) {
      throw new Error(
        'Prebuilt rule assets cannot be fetched until the latest rules package is installed. Call setup() on this object first.'
      );
    }

    const prebuiltRulesToImport = rules.flatMap((rule) => {
      if (rule instanceof Error || rule.version == null) {
        return [];
      }
      return {
        rule_id: rule.rule_id,
        version: rule.version,
      };
    });

    return this.ruleAssetsClient.fetchAssetsByVersion(prebuiltRulesToImport);
  }
}
