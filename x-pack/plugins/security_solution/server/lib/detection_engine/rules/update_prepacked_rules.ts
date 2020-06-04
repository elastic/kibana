/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { AlertsClient } from '../../../../../alerts/server';
import { patchRules } from './patch_rules';
import { PrepackagedRules } from '../types';
import { readRules } from './read_rules';

export const updatePrepackagedRules = async (
  alertsClient: AlertsClient,
  savedObjectsClient: SavedObjectsClientContract,
  rules: PrepackagedRules[],
  outputIndex: string
): Promise<void> => {
  await Promise.all(
    rules.map(async (rule) => {
      const {
        description,
        false_positives: falsePositives,
        from,
        immutable,
        query,
        language,
        saved_id: savedId,
        meta,
        filters,
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
      } = rule;

      const existingRule = await readRules({ alertsClient, ruleId, id: undefined });

      // Note: we do not pass down enabled as we do not want to suddenly disable
      // or enable rules on the user when they were not expecting it if a rule updates
      return patchRules({
        alertsClient,
        description,
        falsePositives,
        from,
        immutable,
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
      });
    })
  );
};
