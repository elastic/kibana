/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../../../common/constants';
import { initPromisePool } from '../../../../../utils/promise_pool';
import {
  DEFAULT_TRANSLATION_RISK_SCORE,
  DEFAULT_TRANSLATION_SEVERITY,
} from '../../../../../../common/siem_migrations/constants';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../..';
import { performTimelinesInstallation } from '../../../../detection_engine/prebuilt_rules/logic/perform_timelines_installation';
import { createPrebuiltRules } from '../../../../detection_engine/prebuilt_rules/logic/rule_objects/create_prebuilt_rules';
import type { IDetectionRulesClient } from '../../../../detection_engine/rule_management/logic/detection_rules_client/detection_rules_client_interface';
import type { RuleCreateProps, RuleResponse } from '../../../../../../common/api/detection_engine';
import type { UpdateRuleMigrationInput } from '../../data/rule_migrations_data_rules_client';
import type { StoredRuleMigration } from '../../types';
import { getPrebuiltRules } from './prebuilt_rules';
import { MAX_TRANSLATED_RULES_TO_INSTALL } from '../constants';

const installPrebuiltRules = async (
  rulesToInstall: StoredRuleMigration[],
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext,
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  detectionRulesClient: IDetectionRulesClient
): Promise<UpdateRuleMigrationInput[]> => {
  // Get required prebuilt rules
  const prebuiltRulesIds = rulesToInstall
    .flatMap((rule) => rule.elastic_rule?.prebuilt_rule_id ?? [])
    .filter((value, index, self) => self.indexOf(value) === index);
  const prebuiltRules = await getPrebuiltRules(rulesClient, savedObjectsClient, prebuiltRulesIds);

  const { installed: alreadyInstalledRules, installable } = prebuiltRules.reduce(
    (acc, item) => {
      if (item.current) {
        acc.installed.push(item.current);
      } else {
        acc.installable.push(item.target);
      }
      return acc;
    },
    { installed: [], installable: [] } as {
      installed: RuleResponse[];
      installable: RuleResponse[];
    }
  );

  // Install prebuilt rules
  // TODO: we need to do an error handling which can happen during the rule installation
  const { results: newlyInstalledRules } = await createPrebuiltRules(
    detectionRulesClient,
    installable
  );
  await performTimelinesInstallation(securitySolutionContext);

  const installedRules = [
    ...alreadyInstalledRules,
    ...newlyInstalledRules.map((value) => value.result),
  ];

  // Create migration rules updates templates
  const rulesToUpdate: UpdateRuleMigrationInput[] = [];
  installedRules.forEach((installedRule) => {
    const filteredRules = rulesToInstall.filter(
      (rule) => rule.elastic_rule?.prebuilt_rule_id === installedRule.rule_id
    );
    rulesToUpdate.push(
      ...filteredRules.map(({ id }) => ({
        id,
        elastic_rule: {
          id: installedRule.id,
        },
      }))
    );
  });

  return rulesToUpdate;
};

export const installCustomRules = async (
  rulesToInstall: StoredRuleMigration[],
  detectionRulesClient: IDetectionRulesClient,
  logger: Logger
): Promise<UpdateRuleMigrationInput[]> => {
  const rulesToUpdate: UpdateRuleMigrationInput[] = [];
  const createCustomRulesOutcome = await initPromisePool({
    concurrency: MAX_RULES_TO_UPDATE_IN_PARALLEL,
    items: rulesToInstall,
    executor: async (rule) => {
      if (!rule.elastic_rule?.query || !rule.elastic_rule?.description) {
        return;
      }
      const payloadRule: RuleCreateProps = {
        type: 'esql',
        language: 'esql',
        query: rule.elastic_rule.query,
        name: rule.elastic_rule.title,
        description: rule.elastic_rule.description,
        severity: DEFAULT_TRANSLATION_SEVERITY,
        risk_score: DEFAULT_TRANSLATION_RISK_SCORE,
      };
      const createdRule = await detectionRulesClient.createPrebuiltRule({
        params: payloadRule,
      });
      rulesToUpdate.push({
        id: rule.id,
        elastic_rule: {
          id: createdRule.id,
        },
      });
    },
  });
  if (createCustomRulesOutcome.errors) {
    // TODO: we need to do an error handling which can happen during the rule creation
    logger.debug(
      `Failed to create some of the rules because of errors: ${JSON.stringify(
        createCustomRulesOutcome.errors
      )}`
    );
  }
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

  const { data: rulesToInstall } = await ruleMigrationsClient.data.rules.get(
    {
      migrationId,
      ids,
      installable: true,
    },
    0,
    MAX_TRANSLATED_RULES_TO_INSTALL
  );

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
