/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertObjectKeysToSnakeCase } from '../../../../../../utils/object_case_converters';
import type { BaseRuleParams } from '../../../../rule_schema';
import { migrateLegacyInvestigationFields } from '../../../utils/utils';

export const commonParamsCamelToSnake = (params: BaseRuleParams) => {
  return {
    description: params.description,
    risk_score: params.riskScore,
    severity: params.severity,
    building_block_type: params.buildingBlockType,
    namespace: params.namespace,
    note: params.note,
    license: params.license,
    output_index: params.outputIndex,
    timeline_id: params.timelineId,
    timeline_title: params.timelineTitle,
    meta: params.meta,
    rule_name_override: params.ruleNameOverride,
    timestamp_override: params.timestampOverride,
    timestamp_override_fallback_disabled: params.timestampOverrideFallbackDisabled,
    investigation_fields: migrateLegacyInvestigationFields(params.investigationFields),
    author: params.author,
    false_positives: params.falsePositives,
    from: params.from,
    rule_id: params.ruleId,
    max_signals: params.maxSignals,
    risk_score_mapping: params.riskScoreMapping,
    severity_mapping: params.severityMapping,
    threat: params.threat,
    to: params.to,
    references: params.references,
    version: params.version,
    exceptions_list: params.exceptionsList,
    immutable: params.immutable,
    rule_source: convertObjectKeysToSnakeCase(params.ruleSource),
    related_integrations: params.relatedIntegrations ?? [],
    required_fields: params.requiredFields ?? [],
    setup: params.setup ?? '',
  };
};
