/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import snakecaseKeys from 'snakecase-keys';
import { transformAlertToRuleResponseAction } from '../../../../../../../common/detection_engine/transform_actions';
import { convertObjectKeysToSnakeCase } from '../../../../../../utils/object_case_converters';
import type { BaseRuleParams } from '../../../../rule_schema';
import { migrateLegacyInvestigationFields } from '../../../utils/utils';
import type { NormalizedRuleParams } from './normalize_rule_params';

/**
 * @deprecated Use convertObjectKeysToSnakeCase instead
 */
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
    rule_source: params.ruleSource ? convertObjectKeysToSnakeCase(params.ruleSource) : undefined,
    related_integrations: params.relatedIntegrations ?? [],
    required_fields: params.requiredFields ?? [],
    response_actions: params.responseActions?.map(transformAlertToRuleResponseAction),
    setup: params.setup ?? '',
  };
};

export const normalizedCommonParamsCamelToSnake = (params: NormalizedRuleParams) => {
  return {
    ...commonParamsCamelToSnake(params),
    rule_source: snakecaseKeys(params.ruleSource, { deep: true }),
  };
};
