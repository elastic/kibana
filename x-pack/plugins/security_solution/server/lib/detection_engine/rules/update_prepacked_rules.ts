/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { SavedObjectsClientContract } from '@kbn/core/server';
import { RulesClient, PartialRule } from '@kbn/alerting-plugin/server';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { MAX_RULES_TO_UPDATE_IN_PARALLEL } from '../../../../common/constants';
import { patchRules } from './patch_rules';
import { readRules } from './read_rules';
import { PartialFilter } from '../types';
import { RuleParams } from '../schemas/rule_schemas';
import { legacyMigrate } from './utils';
import { deleteRules } from './delete_rules';
import { PrepackagedRulesError } from '../routes/rules/add_prepackaged_rules_route';
import { IRuleExecutionLogForRoutes } from '../rule_execution_log';
import { createRules } from './create_rules';
import { transformAlertToRuleAction } from '../../../../common/detection_engine/transform_actions';

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
  rules: AddPrepackagedRulesSchemaDecoded[],
  outputIndex: string,
  isRuleRegistryEnabled: boolean,
  ruleExecutionLog: IRuleExecutionLogForRoutes
): Promise<void> => {
  const ruleChunks = chunk(MAX_RULES_TO_UPDATE_IN_PARALLEL, rules);
  for (const ruleChunk of ruleChunks) {
    const rulePromises = createPromises(
      rulesClient,
      savedObjectsClient,
      ruleChunk,
      outputIndex,
      isRuleRegistryEnabled,
      ruleExecutionLog
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
  rules: AddPrepackagedRulesSchemaDecoded[],
  outputIndex: string,
  isRuleRegistryEnabled: boolean,
  ruleExecutionLog: IRuleExecutionLogForRoutes
): Array<Promise<PartialRule<RuleParams> | null>> => {
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

    if (!migratedRule) {
      throw new PrepackagedRulesError(`Failed to find rule ${ruleId}`, 500);
    }

    // If we're trying to change the type of a prepackaged rule, we need to delete the old one
    // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
    // and exception lists from the old rule
    if (type !== migratedRule.params.type) {
      await deleteRules({
        ruleId: migratedRule.id,
        rulesClient,
        ruleExecutionLog,
      });

      return (await createRules({
        id: migratedRule.id,
        isRuleRegistryEnabled,
        rulesClient,
        anomalyThreshold,
        author,
        buildingBlockType,
        description,
        enabled: migratedRule.enabled, // Enabled comes from existing rule
        eventCategoryOverride,
        falsePositives,
        from,
        immutable: true, // At the moment we force all prepackaged rules to be immutable
        query,
        language,
        license,
        machineLearningJobId,
        outputIndex,
        savedId,
        timelineId,
        timelineTitle,
        meta,
        filters,
        ruleId,
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
        to,
        type,
        threat,
        threatFilters,
        threatMapping,
        threatLanguage,
        concurrentSearches,
        itemsPerSearch,
        threatQuery,
        threatIndex,
        threatIndicatorPath,
        threshold,
        throttle: migratedRule.throttle, // Throttle comes from the existing rule
        timestampOverride,
        references,
        note,
        version,
        // The exceptions list passed in to this function has already been merged with the exceptions list of
        // the existing rule
        exceptionsList,
        actions: migratedRule.actions.map(transformAlertToRuleAction), // Actions come from the existing rule
      })) as PartialRule<RuleParams>; // TODO: Replace AddPrepackagedRulesSchema with type specific rules schema so we can clean up these types
    } else {
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
    }
  });
};
