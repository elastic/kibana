/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickBy } from 'lodash/fp';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, OutputRuleAlertRest } from '../types';

interface BuildRuleParams {
  ruleParams: RuleTypeParams;
  name: string;
  id: string;
  actions: RuleAlertAction[];
  enabled: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  interval: string;
  tags: string[];
  throttle: string;
}

export const buildRule = ({
  ruleParams,
  name,
  id,
  actions,
  enabled,
  createdAt,
  createdBy,
  updatedAt,
  updatedBy,
  interval,
  tags,
  throttle,
}: BuildRuleParams): Partial<OutputRuleAlertRest> => {
  return pickBy<OutputRuleAlertRest>((value: unknown) => value != null, {
    id,
    rule_id: ruleParams.ruleId,
    actions,
    false_positives: ruleParams.falsePositives,
    saved_id: ruleParams.savedId,
    timeline_id: ruleParams.timelineId,
    timeline_title: ruleParams.timelineTitle,
    meta: ruleParams.meta,
    max_signals: ruleParams.maxSignals,
    risk_score: ruleParams.riskScore,
    output_index: ruleParams.outputIndex,
    description: ruleParams.description,
    note: ruleParams.note,
    from: ruleParams.from,
    immutable: ruleParams.immutable,
    index: ruleParams.index,
    interval,
    language: ruleParams.language,
    name,
    query: ruleParams.query,
    references: ruleParams.references,
    severity: ruleParams.severity,
    tags,
    type: ruleParams.type,
    to: ruleParams.to,
    enabled,
    filters: ruleParams.filters,
    created_by: createdBy,
    updated_by: updatedBy,
    threat: ruleParams.threat,
    throttle,
    version: ruleParams.version,
    created_at: createdAt,
    updated_at: updatedAt,
    exceptions_list: ruleParams.exceptions_list,
    machine_learning_job_id: ruleParams.machineLearningJobId,
    anomaly_threshold: ruleParams.anomalyThreshold,
  });
};
