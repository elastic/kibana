/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsFindResult } from 'kibana/server';
import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import type { EventLogTypeStatusAggs, RuleSearchResult } from '../types';
import type { EventLogStatusMetric } from '../detections/rules/types';
import { getEventLogAggByStatuses } from './utils/get_event_log_agg_by_statuses';
import { transformEventLogTypeStatus } from './utils/transform_event_log_type_status';
import { getInitialEventLogUsage } from '../detections/rules/get_initial_usage';
import { getSearchForAllRules } from './utils/get_search_for_all_rules';
import { getSearchForElasticRules } from './utils/get_search_for_elastic_rules';
import { getSearchForCustomRules } from './utils/get_search_for_custom_rules';

export interface GetEventLogByTypeAndStatusOptions {
  esClient: ElasticsearchClient;
  eventLogIndex: string;
  logger: Logger;
  ruleResults: Array<SavedObjectsFindResult<RuleSearchResult>>;
}

/**
 * Gets the event logs by their rule type and rule status. Returns the structure
 * transformed. If it malfunctions or times out then it will not malfunction other
 * parts of telemetry.
 * NOTE: This takes in "ruleResults" to filter against elastic rules and custom rules.
 * If the event log recorded information about which rules were elastic vs. custom this
 * would not need to be passed down.
 * @param esClient the elastic client which should be a system based client
 * @param eventLogIndex the index of the event log such as ".kibana-event-log-8.2.0"
 * @param logger The kibana logger
 * @param ruleResults The elastic and custom rules to filter against each.
 * @returns The event log transformed
 */
export const getEventLogByTypeAndStatus = async ({
  esClient,
  eventLogIndex,
  logger,
  ruleResults,
}: GetEventLogByTypeAndStatusOptions): Promise<EventLogStatusMetric> => {
  try {
    const typeAndStatus = await _getEventLogByTypeAndStatus({
      esClient,
      eventLogIndex,
      logger,
      ruleResults,
    });
    return typeAndStatus;
  } catch (error) {
    logger.debug(
      `Error trying to get event log by type and status. Error message is: ${error.message}. Error is: ${error}. Returning empty initialized object.`
    );
    return getInitialEventLogUsage();
  }
};

/**
 * Non-try-catch version. Gets the event logs by their rule type and rule status. Returns the structure
 * transformed.
 * NOTE: This takes in "ruleResults" to filter against elastic rules and custom rules.
 * If the event log recorded information about which rules were elastic vs. custom this
 * would not need to be passed down.
 * @param esClient the elastic client which should be a system based client
 * @param eventLogIndex the index of the event log such as ".kibana-event-log-8.2.0"
 * @param logger The kibana logger
 * @param ruleResults The elastic and custom rules to filter against each.
 * @returns The event log transformed
 */
const _getEventLogByTypeAndStatus = async ({
  esClient,
  eventLogIndex,
  logger,
  ruleResults,
}: GetEventLogByTypeAndStatusOptions): Promise<EventLogStatusMetric> => {
  const aggs = getEventLogAggByStatuses({
    ruleStatuses: ['succeeded', 'failed', 'partial failure'],
    ruleTypes: [
      EQL_RULE_TYPE_ID,
      INDICATOR_RULE_TYPE_ID,
      ML_RULE_TYPE_ID,
      QUERY_RULE_TYPE_ID,
      THRESHOLD_RULE_TYPE_ID,
      SAVED_QUERY_RULE_TYPE_ID,
    ],
  });

  const elasticRuleIds = ruleResults
    .filter((ruleResult) => ruleResult.attributes.params.immutable)
    .map((ruleResult) => {
      return ruleResult.id;
    });

  const queryForTotal = getSearchForAllRules({ eventLogIndex, aggs });
  const queryForElasticRules = getSearchForElasticRules({ eventLogIndex, aggs, elasticRuleIds });
  const queryForCustomRules = getSearchForCustomRules({ eventLogIndex, aggs, elasticRuleIds });
  logger.debug(
    `Getting event logs by type and status with query for total: ${JSON.stringify(
      queryForTotal
    )}, elastic_rules: ${JSON.stringify(queryForElasticRules)} custom_rules: ${JSON.stringify(
      queryForCustomRules
    )}`
  );

  const [totalRules, elasticRules, customRules] = await Promise.all([
    esClient.search<never, EventLogTypeStatusAggs>(queryForTotal),
    esClient.search<never, EventLogTypeStatusAggs>(queryForElasticRules),
    esClient.search<never, EventLogTypeStatusAggs>(queryForCustomRules),
  ]);

  logger.debug(
    `Raw search results of event logs by type and status for total: ${JSON.stringify(
      totalRules
    )} elastic_rules: ${JSON.stringify(elasticRules)}, custom_rules: ${JSON.stringify(customRules)}`
  );

  const totalRulesTransformed = transformEventLogTypeStatus({
    aggs: totalRules.aggregations,
    logger,
  });
  const elasticRulesTransformed = transformEventLogTypeStatus({
    aggs: elasticRules.aggregations,
    logger,
  });
  const customRulesTransformed = transformEventLogTypeStatus({
    aggs: customRules.aggregations,
    logger,
  });

  const logStatusMetric: EventLogStatusMetric = {
    all_rules: totalRulesTransformed,
    elastic_rules: elasticRulesTransformed,
    custom_rules: customRulesTransformed,
  };
  logger.debug(
    `Metrics transformed for event logs of type and status are: ${JSON.stringify(logStatusMetric)}`
  );

  return logStatusMetric;
};
