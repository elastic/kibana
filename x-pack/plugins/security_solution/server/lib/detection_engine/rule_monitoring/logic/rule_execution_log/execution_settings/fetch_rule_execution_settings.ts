/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { ConfigType } from '../../../../../../config';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../../../plugin_contract';

import {
  EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING,
  EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING,
} from '../../../../../../../common/constants';
import type { RuleExecutionSettings } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { LogLevelSetting } from '../../../../../../../common/api/detection_engine/rule_monitoring';

export const fetchRuleExecutionSettings = async (
  config: ConfigType,
  logger: Logger,
  core: SecuritySolutionPluginCoreSetupDependencies,
  savedObjectsClient: SavedObjectsClientContract
): Promise<RuleExecutionSettings> => {
  try {
    const ruleExecutionSettings = await withSecuritySpan('fetchRuleExecutionSettings', async () => {
      const [coreStart] = await withSecuritySpan('getCoreStartServices', () =>
        core.getStartServices()
      );

      const kibanaAdvancedSettings = await withSecuritySpan('getKibanaAdvancedSettings', () => {
        const settingsClient = coreStart.uiSettings.asScopedToClient(savedObjectsClient);
        return settingsClient.getAll();
      });

      return getRuleExecutionSettingsFrom(config, kibanaAdvancedSettings);
    });

    return ruleExecutionSettings;
  } catch (e) {
    const logMessage = 'Error fetching rule execution settings';
    const logReason = e instanceof Error ? e.stack ?? e.message : String(e);
    logger.error(`${logMessage}: ${logReason}`);

    return getRuleExecutionSettingsDefault(config);
  }
};

const getRuleExecutionSettingsFrom = (
  config: ConfigType,
  advancedSettings: Record<string, unknown>
): RuleExecutionSettings => {
  const featureFlagEnabled = config.experimentalFeatures.extendedRuleExecutionLoggingEnabled;

  const advancedSettingEnabled = getSetting<boolean>(
    advancedSettings,
    EXTENDED_RULE_EXECUTION_LOGGING_ENABLED_SETTING,
    false
  );
  const advancedSettingMinLevel = getSetting<LogLevelSetting>(
    advancedSettings,
    EXTENDED_RULE_EXECUTION_LOGGING_MIN_LEVEL_SETTING,
    LogLevelSetting.off
  );

  return {
    extendedLogging: {
      isEnabled: featureFlagEnabled && advancedSettingEnabled,
      minLevel: advancedSettingMinLevel,
    },
  };
};

const getRuleExecutionSettingsDefault = (config: ConfigType): RuleExecutionSettings => {
  const featureFlagEnabled = config.experimentalFeatures.extendedRuleExecutionLoggingEnabled;

  return {
    extendedLogging: {
      isEnabled: featureFlagEnabled,
      minLevel: featureFlagEnabled ? LogLevelSetting.error : LogLevelSetting.off,
    },
  };
};

const getSetting = <T>(settings: Record<string, unknown>, key: string, defaultValue: T): T => {
  const setting = settings[key];
  return setting != null ? (setting as T) : defaultValue;
};
