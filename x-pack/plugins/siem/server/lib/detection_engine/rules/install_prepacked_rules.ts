/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alert } from '../../../../../alerts/common';
import { AlertsClient } from '../../../../../alerts/server';
import { createRules } from './create_rules';
import { PrepackagedRules } from '../types';

export const installPrepackagedRules = (
  alertsClient: AlertsClient,
  rules: PrepackagedRules[],
  outputIndex: string
): Array<Promise<Alert>> =>
  rules.reduce<Array<Promise<Alert>>>((acc, rule) => {
    const {
      anomaly_threshold: anomalyThreshold,
      description,
      enabled,
      false_positives: falsePositives,
      from,
      immutable,
      query,
      language,
      machine_learning_job_id: machineLearningJobId,
      saved_id: savedId,
      timeline_id: timelineId,
      timeline_title: timelineTitle,
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
      note,
      version,
      exceptions_list,
    } = rule;
    return [
      ...acc,
      createRules({
        alertsClient,
        anomalyThreshold,
        description,
        enabled,
        falsePositives,
        from,
        immutable,
        query,
        language,
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
        name,
        severity,
        tags,
        to,
        type,
        threat,
        references,
        note,
        version,
        exceptions_list,
        actions: [], // At this time there is no pre-packaged actions
      }),
    ];
  }, []);
