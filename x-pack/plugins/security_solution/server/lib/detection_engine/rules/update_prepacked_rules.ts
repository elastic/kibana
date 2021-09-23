/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { RulesClient, PartialAlert } from '../../../../../alerting/server';
import { patchRules } from './patch_rules';
import { readRules } from './read_rules';
import { PartialFilter } from '../types';
import { RuleParams } from '../schemas/rule_schemas';
import { IRuleExecutionLogClient } from '../rule_execution_log/types';

/**
 * How many rules to update at a time is set to 50 from errors coming from
 * the slow environments such as cloud when the rule updates are > 100 we were
 * seeing timeout issues.
 *
 * Since there is not timeout options at the alerting API level right now, we are
 * at the mercy of the Elasticsearch server client/server default timeouts and what
 * we are doing could be considered a workaround to not being able to increase the timeouts.
 *
 * However, other bad effects and saturation of connections beyond 50 makes this a "noisy neighbor"
 * if we don't limit its number of connections as we increase the number of rules that can be
 * installed at a time.
 *
 * Lastly, we saw weird issues where Chrome on upstream 408 timeouts will re-call the REST route
 * which in turn could create additional connections we want to avoid.
 *
 * See file import_rules_route.ts for another area where 50 was chosen, therefore I chose
 * 50 here to mimic it as well. If you see this re-opened or what similar to it, consider
 * reducing the 50 above to a lower number.
 *
 * See the original ticket here:
 * https://github.com/elastic/kibana/issues/94418
 */
export const UPDATE_CHUNK_SIZE = 50;

/**
 * Updates the prepackaged rules given a set of rules and output index.
 * This implements a chunked approach to not saturate network connections and
 * avoid being a "noisy neighbor".
 * @param rulesClient Alerting client
 * @param spaceId Current user spaceId
 * @param ruleStatusClient Rule execution log client
 * @param rules The rules to apply the update for
 * @param outputIndex The output index to apply the update to.
 */
export const updatePrepackagedRules = async (
  rulesClient: RulesClient,
  spaceId: string,
  ruleStatusClient: IRuleExecutionLogClient,
  rules: AddPrepackagedRulesSchemaDecoded[],
  outputIndex: string,
  isRuleRegistryEnabled: boolean
): Promise<void> => {
  const ruleChunks = chunk(UPDATE_CHUNK_SIZE, rules);
  for (const ruleChunk of ruleChunks) {
    const rulePromises = createPromises(
      rulesClient,
      spaceId,
      ruleStatusClient,
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
 * @param ruleStatusClient Rule execution log client
 * @param rules The rules to apply the update for
 * @param outputIndex The output index to apply the update to.
 * @returns Promise of what was updated.
 */
export const createPromises = (
  rulesClient: RulesClient,
  spaceId: string,
  ruleStatusClient: IRuleExecutionLogClient,
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
      rule: existingRule,
      savedId,
      spaceId,
      ruleStatusClient,
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
