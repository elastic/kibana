/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { SavedObjectsClientContract } from 'kibana/server';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../common/constants';
import { RulesClient, PartialAlert } from '../../../../../alerting/server';
import { patchRules } from './patch_rules';
import { readRules } from './read_rules';
import { PartialFilter } from '../types';
import { RuleParams } from '../schemas/rule_schemas';
import { legacyMigrate } from './utils';

/**
 * Updates the prepackaged rules given a set of rules and output index.
 * This implements a chunked approach to not saturate network connections and
 * avoid being a "noisy neighbor".
 * @param rulesClient Alerting client
 * @param spaceId Current user spaceId
 * @param rules The rules to apply the update for
 * @param outputIndex The output index to apply the update to.
 */
export const updatePrepackagedRules = async (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  spaceId: string,
  rules: AddPrepackagedRulesSchemaDecoded[],
  outputIndex: string,
  isRuleRegistryEnabled: boolean
): Promise<void> => {
  const ruleChunks = chunk(MAX_RULES_TO_UPDATE_IN_PARALLEL, rules);
  for (const ruleChunk of ruleChunks) {
    const rulePromises = createPromises(
      rulesClient,
      savedObjectsClient,
      spaceId,
      ruleChunk,
      outputIndex,
      isRuleRegistryEnabled
    );
    await Promise.all(rulePromises);
  }
};

/**
 * Creates promises of the rules and returns them.
 * @param rulesClient Alerting client
 * @param spaceId Current user spaceId
 * @param rules The rules to apply the update for
 * @param outputIndex The output index to apply the update to.
 * @returns Promise of what was updated.
 */
export const createPromises = (
  rulesClient: RulesClient,
  savedObjectsClient: SavedObjectsClientContract,
  spaceId: string,
  rules: AddPrepackagedRulesSchemaDecoded[],
  outputIndex: string,
  isRuleRegistryEnabled: boolean
): Array<Promise<PartialAlert<RuleParams> | null>> => {
  return rules.map(async (rule) => {
    const {
      author,
      building_block_type: buildingBlockType,
      description,
      event_category_override: eventCategoryOverride,
      false_positives: falsePositives,
      from,
      query,
      language,
      license,
      saved_id: savedId,
      meta,
      filters: filtersObject,
      rule_id: ruleId,
      index,
      interval,
      max_signals: maxSignals,
      risk_score: riskScore,
      risk_score_mapping: riskScoreMapping,
      rule_name_override: ruleNameOverride,
      name,
      severity,
      severity_mapping: severityMapping,
      tags,
      to,
      type,
      threat,
      threshold,
      threat_filters: threatFilters,
      threat_index: threatIndex,
      threat_indicator_path: threatIndicatorPath,
      threat_query: threatQuery,
      threat_mapping: threatMapping,
      threat_language: threatLanguage,
      concurrent_searches: concurrentSearches,
      items_per_search: itemsPerSearch,
      timestamp_override: timestampOverride,
      references,
      version,
      note,
      throttle,
      anomaly_threshold: anomalyThreshold,
      timeline_id: timelineId,
      timeline_title: timelineTitle,
      machine_learning_job_id: machineLearningJobId,
      exceptions_list: exceptionsList,
    } = rule;

    const existingRule = await readRules({
      isRuleRegistryEnabled,
      rulesClient,
      ruleId,
      id: undefined,
    });

    // TODO: Fix these either with an is conversion or by better typing them within io-ts
    const filters: PartialFilter[] | undefined = filtersObject as PartialFilter[];

    const migratedRule = await legacyMigrate({
      rulesClient,
      savedObjectsClient,
      rule: existingRule,
    });

    // Note: we do not pass down enabled as we do not want to suddenly disable
    // or enable rules on the user when they were not expecting it if a rule updates
    return patchRules({
      rulesClient,
      author,
      buildingBlockType,
      description,
      eventCategoryOverride,
      falsePositives,
      from,
      query,
      language,
      license,
      outputIndex,
      rule: migratedRule,
      savedId,
      meta,
      filters,
      index,
      interval,
      maxSignals,
      riskScore,
      riskScoreMapping,
      ruleNameOverride,
      name,
      severity,
      severityMapping,
      tags,
      timestampOverride,
      to,
      type,
      threat,
      threshold,
      threatFilters,
      threatIndex,
      threatIndicatorPath,
      threatQuery,
      threatMapping,
      threatLanguage,
      concurrentSearches,
      itemsPerSearch,
      references,
      version,
      note,
      anomalyThreshold,
      enabled: undefined,
      timelineId,
      timelineTitle,
      machineLearningJobId,
      exceptionsList,
      throttle,
      actions: undefined,
    });
  });
};
