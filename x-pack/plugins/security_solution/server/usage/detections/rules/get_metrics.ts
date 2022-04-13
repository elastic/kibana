/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from 'kibana/server';
import type { RuleAdoption } from './types';

import { updateRuleUsage } from './update_usage';
import { getDetectionRules } from '../../queries/get_detection_rules';
import { getAlerts } from '../../queries/get_alerts';
import { MAX_PER_PAGE, MAX_RESULTS_WINDOW } from '../../constants';
import { getInitialEventLogUsage, getInitialRulesUsage } from './get_initial_usage';
import { getCaseComments } from '../../queries/get_case_comments';
import { getRuleIdToCasesMap } from './transform_utils/get_rule_id_to_cases_map';
import { getAlertIdToCountMap } from './transform_utils/get_alert_id_to_count_map';
import { getRuleIdToEnabledMap } from './transform_utils/get_rule_id_to_enabled_map';
import { getRuleObjectCorrelations } from './transform_utils/get_rule_object_correlations';
import { getEventLogByTypeAndStatus } from '../../queries/get_event_log_by_type_and_status';

// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActions } from '../../queries/legacy_get_rule_actions';

export interface GetRuleMetricsOptions {
  signalsIndex: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  eventLogIndex: string;
}

export const getRuleMetrics = async ({
  signalsIndex,
  esClient,
  savedObjectsClient,
  logger,
  eventLogIndex,
}: GetRuleMetricsOptions): Promise<RuleAdoption> => {
  try {
    // gets rule saved objects
    const ruleResults = await getDetectionRules({
      savedObjectsClient,
      maxPerPage: MAX_PER_PAGE,
      maxSize: MAX_RESULTS_WINDOW,
      logger,
    });

    // early return if we don't have any detection rules then there is no need to query anything else
    if (ruleResults.length === 0) {
      return {
        detection_rule_detail: [],
        detection_rule_usage: getInitialRulesUsage(),
        detection_rule_status: getInitialEventLogUsage(),
      };
    }

    // gets the alerts data objects
    const detectionAlertsRespPromise = getAlerts({
      esClient,
      signalsIndex: `${signalsIndex}*`,
      maxPerPage: MAX_PER_PAGE,
      maxSize: MAX_RESULTS_WINDOW,
      logger,
    });

    // gets cases saved objects
    const caseCommentsPromise = getCaseComments({
      savedObjectsClient,
      maxSize: MAX_PER_PAGE,
      maxPerPage: MAX_RESULTS_WINDOW,
      logger,
    });

    // gets the legacy rule actions to track legacy notifications.
    const legacyRuleActionsPromise = legacyGetRuleActions({
      savedObjectsClient,
      maxSize: MAX_PER_PAGE,
      maxPerPage: MAX_RESULTS_WINDOW,
      logger,
    });

    // gets the event log information by type and status
    const eventLogMetricsTypeStatusPromise = getEventLogByTypeAndStatus({
      esClient,
      logger,
      eventLogIndex,
      ruleResults,
    });

    const [detectionAlertsResp, caseComments, legacyRuleActions, eventLogMetricsTypeStatus] =
      await Promise.all([
        detectionAlertsRespPromise,
        caseCommentsPromise,
        legacyRuleActionsPromise,
        eventLogMetricsTypeStatusPromise,
      ]);

    // create in-memory maps for correlation
    const legacyNotificationRuleIds = getRuleIdToEnabledMap(legacyRuleActions);
    const casesRuleIds = getRuleIdToCasesMap(caseComments);
    const alertsCounts = getAlertIdToCountMap(detectionAlertsResp);

    // correlate the rule objects to the results
    const rulesCorrelated = getRuleObjectCorrelations({
      ruleResults,
      legacyNotificationRuleIds,
      casesRuleIds,
      alertsCounts,
    });

    // Only bring back rule detail on elastic prepackaged detection rules
    const elasticRuleObjects = rulesCorrelated.filter((hit) => hit.elastic_rule === true);

    // calculate the rule usage
    const rulesUsage = rulesCorrelated.reduce(
      (usage, rule) => updateRuleUsage(rule, usage),
      getInitialRulesUsage()
    );

    return {
      detection_rule_detail: elasticRuleObjects,
      detection_rule_usage: rulesUsage,
      detection_rule_status: eventLogMetricsTypeStatus,
    };
  } catch (e) {
    // ignore failure, usage will be zeroed. We use debug mode to not unnecessarily worry users as this will not effect them.
    logger.debug(
      `Encountered unexpected condition in telemetry of message: ${e.message}, object: ${e}. Telemetry for "detection rules" being skipped.`
    );
    return {
      detection_rule_detail: [],
      detection_rule_usage: getInitialRulesUsage(),
      detection_rule_status: getInitialEventLogUsage(),
    };
  }
};
