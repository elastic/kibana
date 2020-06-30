/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { AlertsClient } from '../../../../../alerts/server';
import { patchRules } from './patch_rules';
import { readRules } from './read_rules';
import { PartialFilter } from '../types';

export const updatePrepackagedRules = async (
  alertsClient: AlertsClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: AddPrepackagedRulesSchemaDecoded[],
  outputIndex: string
): Promise<void> => {
  await Promise.all(
    rules.map(async (rule) => {
      const {
        description,
        false_positives: falsePositives,
        from,
        query,
        language,
        saved_id: savedId,
        meta,
        filters: filtersObject,
        rule_id: ruleId,
        index,
        interval,
        max_signals: maxSignals,
        risk_score: riskScore,
        name,
        severity,
        tags,
        to,
        type,
        threat,
        references,
        version,
        note,
        anomaly_threshold: anomalyThreshold,
        timeline_id: timelineId,
        timeline_title: timelineTitle,
        machine_learning_job_id: machineLearningJobId,
        exceptions_list: exceptionsList,
      } = rule;

      const existingRule = await readRules({ alertsClient, ruleId, id: undefined });

      // TODO: Fix these either with an is conversion or by better typing them within io-ts
      const filters: PartialFilter[] | undefined = filtersObject as PartialFilter[];

      // Note: we do not pass down enabled as we do not want to suddenly disable
      // or enable rules on the user when they were not expecting it if a rule updates
      return patchRules({
        alertsClient,
        description,
        falsePositives,
        from,
        query,
        language,
        outputIndex,
        rule: existingRule,
        savedId,
        savedObjectsClient,
        meta,
        filters,
        index,
        interval,
        maxSignals,
        riskScore,
        name,
        severity,
        tags,
        to,
        type,
        threat,
        references,
        version,
        note,
        anomalyThreshold,
        enabled: undefined,
        timelineId,
        timelineTitle,
        machineLearningJobId,
        exceptionsList,
        actions: undefined,
      });
    })
  );
};
