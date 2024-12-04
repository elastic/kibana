/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import {
  DEFAULT_TRANSLATION_RISK_SCORE,
  DEFAULT_TRANSLATION_SEVERITY,
} from '../../../../../../common/siem_migrations/constants';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../..';
import { createPrebuiltRuleObjectsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_objects/prebuilt_rule_objects_client';
import { performTimelinesInstallation } from '../../../../detection_engine/prebuilt_rules/logic/perform_timelines_installation';
import { createPrebuiltRules } from '../../../../detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules';
import type { PrebuiltRuleAsset } from '../../../../detection_engine/prebuilt_rules';
import { getRuleGroups } from '../../../../detection_engine/prebuilt_rules/model/rule_groups/get_rule_groups';
import { fetchRuleVersionsTriad } from '../../../../detection_engine/prebuilt_rules/logic/rule_versions/fetch_rule_versions_triad';
import { createPrebuiltRuleAssetsClient } from '../../../../detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import type { IDetectionRulesClient } from '../../../../detection_engine/rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { RuleCreateProps } from '../../../../../../common/api/detection_engine';
import type { UpdateRuleMigrationInput } from '../../data/rule_migrations_data_rules_client';
import type { StoredRuleMigration } from '../../types';

const installPrebuiltRules = async (
  rulesToInstall: StoredRuleMigration[],
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext,
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  detectionRulesClient: IDetectionRulesClient
): Promise<UpdateRuleMigrationInput[]> => {
  const ruleAssetsClient = createPrebuiltRuleAssetsClient(savedObjectsClient);
  const ruleObjectsClient = createPrebuiltRuleObjectsClient(rulesClient);
  const ruleVersionsMap = await fetchRuleVersionsTriad({
    ruleAssetsClient,
    ruleObjectsClient,
  });
  const { currentRules, installableRules } = getRuleGroups(ruleVersionsMap);

  const rulesToUpdate: UpdateRuleMigrationInput[] = [];
  const assetsToInstall: PrebuiltRuleAsset[] = [];
  rulesToInstall.forEach((ruleToInstall) => {
    // If prebuilt rule has already been installed, then just update migration rule with the installed rule id
    const installedRule = currentRules.find(
      (rule) => rule.rule_id === ruleToInstall.elastic_rule?.prebuilt_rule_id
    );
    if (installedRule) {
      rulesToUpdate.push({
        id: ruleToInstall.id,
        elastic_rule: {
          id: installedRule.id,
        },
      });
      return;
    }

    // If prebuilt rule is not installed, then keep reference to install it
    const installableRule = installableRules.find(
      (rule) => rule.rule_id === ruleToInstall.elastic_rule?.prebuilt_rule_id
    );
    if (installableRule) {
      assetsToInstall.push(installableRule);
    }
  });

  // Filter out any duplicates which can occur when multiple translated rules matched the same prebuilt rule
  const filteredAssetsToInstall = assetsToInstall.filter(
    (value, index, self) => index === self.findIndex((rule) => rule.rule_id === value.rule_id)
  );

  // TODO: we need to do an error handling which can happen during the rule installation
  const { results: installedRules } = await createPrebuiltRules(
    detectionRulesClient,
    filteredAssetsToInstall
  );
  await performTimelinesInstallation(securitySolutionContext);

  installedRules.forEach((installedRule) => {
    const rules = rulesToInstall.filter(
      (rule) => rule.elastic_rule?.prebuilt_rule_id === installedRule.result.rule_id
    );
    rules.forEach((prebuiltRule) => {
      rulesToUpdate.push({
        id: prebuiltRule.id,
        elastic_rule: {
          id: installedRule.result.id,
        },
      });
    });
  });

  return rulesToUpdate;
};

const installCustomRules = async (
  rulesToInstall: StoredRuleMigration[],
  detectionRulesClient: IDetectionRulesClient,
  logger: Logger
): Promise<UpdateRuleMigrationInput[]> => {
  const rulesToUpdate: UpdateRuleMigrationInput[] = [];
  await Promise.all(
    rulesToInstall.map(async (rule) => {
      if (!rule.elastic_rule?.query || !rule.elastic_rule?.description) {
        return;
      }
      try {
        const payloadRule: RuleCreateProps = {
          type: 'esql',
          language: 'esql',
          query: rule.elastic_rule.query,
          name: rule.elastic_rule.title,
          description: rule.elastic_rule.description,
          severity: DEFAULT_TRANSLATION_SEVERITY,
          risk_score: DEFAULT_TRANSLATION_RISK_SCORE,
        };
        const createdRule = await detectionRulesClient.createCustomRule({
          params: payloadRule,
        });
        rulesToUpdate.push({
          id: rule.id,
          elastic_rule: {
            id: createdRule.id,
          },
        });
      } catch (err) {
        // TODO: we need to do an error handling which can happen during the rule creation
        logger.debug(`Could not create a rule because of error: ${JSON.stringify(err)}`);
      }
    })
  );
  return rulesToUpdate;
};

interface InstallTranslatedProps {
  /**
   * The migration id
   */
  migrationId: string;

  /**
   * If specified, then installable translated rules in theThe list will be installed,
   * otherwise all installable translated rules will be installed.
   */
  ids?: string[];

  /**
   * The security solution context
   */
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext;

  /**
   * The rules client to create rules
   */
  rulesClient: RulesClient;

  /**
   * The saved objects client
   */
  savedObjectsClient: SavedObjectsClientContract;

  /**
   * The logger
   */
  logger: Logger;
}

export const installTranslated = async ({
  migrationId,
  ids,
  securitySolutionContext,
  rulesClient,
  savedObjectsClient,
  logger,
}: InstallTranslatedProps) => {
  const detectionRulesClient = securitySolutionContext.getDetectionRulesClient();
  const ruleMigrationsClient = securitySolutionContext.getSiemRuleMigrationsClient();

  const { data: rulesToInstall } = await ruleMigrationsClient.data.rules.get({
    migrationId,
    ids,
    installable: true,
  });

  const { customRulesToInstall, prebuiltRulesToInstall } = rulesToInstall.reduce(
    (acc, item) => {
      if (item.elastic_rule?.prebuilt_rule_id) {
        acc.prebuiltRulesToInstall.push(item);
      } else {
        acc.customRulesToInstall.push(item);
      }
      return acc;
    },
    { customRulesToInstall: [], prebuiltRulesToInstall: [] } as {
      customRulesToInstall: StoredRuleMigration[];
      prebuiltRulesToInstall: StoredRuleMigration[];
    }
  );

  const updatedPrebuiltRules = await installPrebuiltRules(
    prebuiltRulesToInstall,
    securitySolutionContext,
    rulesClient,
    savedObjectsClient,
    detectionRulesClient
  );

  const updatedCustomRules = await installCustomRules(
    customRulesToInstall,
    detectionRulesClient,
    logger
  );

  const rulesToUpdate: UpdateRuleMigrationInput[] = [
    ...updatedPrebuiltRules,
    ...updatedCustomRules,
  ];

  if (rulesToUpdate.length) {
    await ruleMigrationsClient.data.rules.update(rulesToUpdate);
  }
};
