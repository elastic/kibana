/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickBy } from 'lodash/fp';
import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams } from '../types';
import { buildRiskScoreFromMapping } from './mappings/build_risk_score_from_mapping';
import { SignalSourceHit } from './types';
import { buildSeverityFromMapping } from './mappings/build_severity_from_mapping';
import { buildRuleNameFromMapping } from './mappings/build_rule_name_from_mapping';

interface BuildRuleParams {
  ruleParams: RuleTypeParams;
  name: string;
  id: string;
  actions: RuleAlertAction[];
  enabled: boolean;
  createdAt: string;
  createdBy: string;
  doc: SignalSourceHit;
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
  doc,
  updatedAt,
  updatedBy,
  interval,
  tags,
  throttle,
}: BuildRuleParams): Partial<RulesSchema> => {
  const { riskScore, riskScoreMeta } = buildRiskScoreFromMapping({
    doc,
    riskScore: ruleParams.riskScore,
    riskScoreMapping: ruleParams.riskScoreMapping,
  });

  const { severity, severityMeta } = buildSeverityFromMapping({
    doc,
    severity: ruleParams.severity,
    severityMapping: ruleParams.severityMapping,
  });

  const { ruleName, ruleNameMeta } = buildRuleNameFromMapping({
    doc,
    ruleName: name,
    ruleNameMapping: ruleParams.ruleNameOverride,
  });

  const meta = { ...ruleParams.meta, ...riskScoreMeta, ...severityMeta, ...ruleNameMeta };

  return pickBy<RulesSchema>((value: unknown) => value != null, {
    id,
    rule_id: ruleParams.ruleId ?? '(unknown rule_id)',
    actions,
    author: ruleParams.author ?? [],
    building_block_type: ruleParams.buildingBlockType,
    false_positives: ruleParams.falsePositives,
    saved_id: ruleParams.savedId,
    timeline_id: ruleParams.timelineId,
    timeline_title: ruleParams.timelineTitle,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
    max_signals: ruleParams.maxSignals,
    risk_score: riskScore,
    risk_score_mapping: ruleParams.riskScoreMapping ?? [],
    output_index: ruleParams.outputIndex,
    description: ruleParams.description,
    note: ruleParams.note,
    from: ruleParams.from,
    immutable: ruleParams.immutable,
    index: ruleParams.index,
    interval,
    language: ruleParams.language,
    license: ruleParams.license,
    name: ruleName,
    query: ruleParams.query,
    references: ruleParams.references,
    rule_name_override: ruleParams.ruleNameOverride,
    severity,
    severity_mapping: ruleParams.severityMapping ?? [],
    tags,
    type: ruleParams.type,
    to: ruleParams.to,
    enabled,
    filters: ruleParams.filters,
    created_by: createdBy,
    updated_by: updatedBy,
    threat: ruleParams.threat ?? [],
    timestamp_override: ruleParams.timestampOverride, // TODO: Timestamp Override via timestamp_override
    throttle,
    version: ruleParams.version,
    created_at: createdAt,
    updated_at: updatedAt,
    exceptions_list: ruleParams.exceptionsList ?? [],
    machine_learning_job_id: ruleParams.machineLearningJobId,
    anomaly_threshold: ruleParams.anomalyThreshold,
    threshold: ruleParams.threshold,
  });
};
