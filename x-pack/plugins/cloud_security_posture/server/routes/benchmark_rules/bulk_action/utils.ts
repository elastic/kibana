/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import type { FindResult, RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleParams } from '@kbn/alerting-plugin/server/application/rule/types';
import {
  CspBenchmarkRule,
  CspBenchmarkRulesStates,
  CspSettings,
} from '../../../../common/types/rules/v3';

import {
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
  INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
} from '../../../../common/constants';

const CSP_RULE_TAG = 'Cloud Security';
const CSP_RULE_TAG_USE_CASE = 'Use Case: Configuration Audit';
const CSP_RULE_TAG_DATA_SOURCE_PREFIX = 'Data Source: ';

const STATIC_RULE_TAGS = [CSP_RULE_TAG, CSP_RULE_TAG_USE_CASE];

// TODO: move it to common
export function convertRuleTagsToKQL(tags: string[]): string {
  const TAGS_FIELD = 'alert.attributes.tags';
  return `${TAGS_FIELD}:(${tags.map((tag) => `"${tag}"`).join(' AND ')})`;
}

export const getDetectionRules = async (
  detectionRulesClient: RulesClient,
  rulesTags: string[][]
): Promise<Array<FindResult<RuleParams>>> => {
  const foo = await detectionRulesClient.find({
    excludeFromPublicApi: false,
    options: {
      filter: convertRuleTagsToKQL(rulesTags[0]),
      searchFields: ['tags'],
      page: 1,
      per_page: 1,
    },
  });

  const detectionRules = Promise.all(
    rulesTags.map(async (ruleTags) => {
      return detectionRulesClient.find({
        excludeFromPublicApi: false,
        options: {
          filter: convertRuleTagsToKQL(ruleTags),
          searchFields: ['tags'],
          page: 1,
          per_page: 1,
        },
      });
    })
  );

  return detectionRules;
};

export const getFindingsDetectionRuleSearchTags = (cspBenchmarkRule: CspBenchmarkRule) => {
  // ex: cis_gcp to ['CIS', 'GCP']
  const benchmarkIdTags = cspBenchmarkRule.metadata.benchmark.id
    .split('_')
    .map((tag) => tag.toUpperCase());
  // ex: 'CIS GCP 1.1'
  const benchmarkRuleNumberTag = `${cspBenchmarkRule.metadata.benchmark.id
    .replace('_', ' ')
    .toUpperCase()} ${cspBenchmarkRule.metadata.benchmark.rule_number}`;

  return benchmarkIdTags.concat([benchmarkRuleNumberTag]);
};

const generateBenchmarkRuleTags = (rule: CspBenchmarkRule) => {
  return [STATIC_RULE_TAGS]
    .concat(getFindingsDetectionRuleSearchTags(rule))
    .concat(
      rule.metadata.benchmark.posture_type
        ? [
            rule.metadata.benchmark.posture_type.toUpperCase(),
            `${CSP_RULE_TAG_DATA_SOURCE_PREFIX}${rule.metadata.benchmark.posture_type.toUpperCase()}`,
          ]
        : []
    )
    .concat(
      rule.metadata.benchmark.posture_type === 'cspm' ? ['Domain: Cloud'] : ['Domain: Container']
    )
    .flat();
};

export const getBenchmarkRulesTags = async (
  soClient: SavedObjectsClientContract,
  ruleIds: string[]
): Promise<CspBenchmarkRule[]> => {
  const bulkGetObject = ruleIds.map((ruleId) => ({
    id: ruleId,
    type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  }));
  const cspBenchmarkRulesSo = await soClient.bulkGet<CspBenchmarkRule>(bulkGetObject);
  // TODO: handle empty response
  const benchmarkRules = cspBenchmarkRulesSo.saved_objects.map(
    (cspBenchmarkRule) => cspBenchmarkRule.attributes
  );
  return benchmarkRules;
};

export const muteDetectionRules = async (
  soClient: SavedObjectsClientContract,
  detectionRulesClient: RulesClient,
  rulesIds: string[]
) => {
  const benchmarkRules = await getBenchmarkRulesTags(soClient, rulesIds);

  const benchmarkRulesTags = benchmarkRules.map((benchmarkRule) =>
    generateBenchmarkRuleTags(benchmarkRule)
  );
  // TODO: handle empty state
  const detectionRules = await getDetectionRules(detectionRulesClient, benchmarkRulesTags);

  const idsToDisable = detectionRules
    .map((detectionRule) => {
      return detectionRule.data.map((data) => data.id);
    })
    .flat();
  // TODO: handle empty ids
  await detectionRulesClient.bulkDisableRules({ ids: idsToDisable });
};

export const updateRulesStates = async (
  encryptedSoClient: SavedObjectsClientContract,
  newRulesStates: CspBenchmarkRulesStates
) => {
  return await encryptedSoClient.update<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID,
    { rules: newRulesStates }
  );
};

export const setRulesStates = (
  rulesStates: CspBenchmarkRulesStates,
  ruleKeys: string[],
  state: boolean
): CspBenchmarkRulesStates => {
  ruleKeys.forEach((ruleKey) => {
    if (rulesStates[ruleKey]) {
      // Rule exists, set entry
      rulesStates[ruleKey] = {
        muted: state,
        benchmarkId: '',
        benchmarkVersion: '',
        ruleNumber: '',
        ruleId: '',
      };
    } else {
      // Rule does not exist, create an entry
      rulesStates[ruleKey] = {
        muted: state,
        benchmarkId: '',
        benchmarkVersion: '',
        ruleNumber: '',
        ruleId: '',
      };
    }
  });
  return rulesStates;
};

export const createCspSettingObject = async (encryptedSoClient: SavedObjectsClientContract) => {
  return encryptedSoClient.create<CspSettings>(
    INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
    {
      rules: {},
    },
    { id: INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID }
  );
};

export const createCspSettingObjectSafe = async (
  encryptedSoClient: SavedObjectsClientContract,
  logger: Logger
) => {
  const cspSettings = await getCspSettingsSafe(encryptedSoClient, logger);
  return cspSettings;
};

export const getCspSettingsSafe = async (
  encryptedSoClient: SavedObjectsClientContract,
  logger: Logger
): Promise<CspSettings> => {
  try {
    const cspSettings = await encryptedSoClient.get<CspSettings>(
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_TYPE,
      INTERNAL_CSP_SETTINGS_SAVED_OBJECT_ID
    );
    return cspSettings.attributes;
  } catch (err) {
    const error = transformError(err);
    logger.error(`An error occurred while trying to fetch csp settings: ${error}`);
    logger.warn(`Trying to create new csp settings object`);
    return (await createCspSettingObject(encryptedSoClient)).attributes;
  }
};

export const buildRuleKey = (benchmarkId: string, benchmarkVersion: string, ruleNumber: string) => {
  return `${benchmarkId};${benchmarkVersion};${ruleNumber}`;
};
