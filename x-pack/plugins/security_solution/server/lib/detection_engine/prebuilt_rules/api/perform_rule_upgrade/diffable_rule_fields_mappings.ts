/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type {
  RuleSchedule,
  InlineKqlQuery,
  ThreeWayDiff,
  DiffableRuleTypes,
} from '../../../../../../common/api/detection_engine';
import { type AllFieldsDiff } from '../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';

/**
 * Retrieves and transforms the value for a specific field from a DiffableRule group.
 *
 * Maps PrebuiltRuleAsset schema fields to their corresponding DiffableRule group values. It also
 * applies necessary transformations to ensure the returned value matches the expected format
 * for the PrebuiltRuleAsset schema.
 *
 * @param {keyof PrebuiltRuleAsset} field - The field name in the PrebuiltRuleAsset schema.
 * @param {ThreeWayDiff<unknown>['merged_version']} diffableField - The corresponding field value from the DiffableRule.
 *
 * @example
 * // For an 'index' field
 * mapDiffableRuleFieldValueToRuleSchema('index', { index_patterns: ['logs-*'] })
 * // Returns: ['logs-*']
 *
 * @example
 * // For a 'from' field in a rule schedule
 * mapDiffableRuleFieldValueToRuleSchema('from', { interval: '5d', lookback: '30d' })
 * // Returns: 'now-30d'
 *
 */
export const mapDiffableRuleFieldValueToRuleSchemaFormat = (
  fieldName: keyof PrebuiltRuleAsset,
  diffableField: ThreeWayDiff<unknown>['merged_version']
) => {
  const diffableRuleSubfieldName = mapRuleFieldToDiffableRuleSubfield(fieldName);

  const transformedValue = transformDiffableFieldValues(fieldName, diffableField);
  if (transformedValue.type === 'TRANSFORMED_FIELD') {
    return transformedValue.value;
  }

  // From the ThreeWayDiff, get the specific field that maps to the diffable rule field
  // Otherwise, the diffableField itself already matches the rule field, so retrieve that value.
  const mappedField = get(diffableField, diffableRuleSubfieldName, diffableField);

  return mappedField;
};

interface MapRuleFieldToDiffableRuleFieldParams {
  ruleType: DiffableRuleTypes;
  fieldName: string;
}
/**
 * Maps a PrebuiltRuleAsset schema field name to its corresponding DiffableRule group.
 *
 * Determines which group in the DiffableRule schema a given field belongs to. Handles special
 * cases for query-related fields based on the rule type.
 *
 * @param {string} fieldName - The field name from the PrebuiltRuleAsset schema.
 * @param {string} ruleType - The type of the rule being processed.
 *
 * @example
 * mapRuleFieldToDiffableRuleField('index', 'query')
 * // Returns: 'data_source'
 *
 * @example
 * mapRuleFieldToDiffableRuleField('query', 'eql')
 * // Returns: 'eql_query'
 *
 */
export function mapRuleFieldToDiffableRuleField({
  ruleType,
  fieldName,
}: MapRuleFieldToDiffableRuleFieldParams): keyof AllFieldsDiff {
  const diffableRuleFieldMap: Record<string, keyof AllFieldsDiff> = {
    building_block_type: 'building_block',
    saved_id: 'kql_query',
    threat_query: 'threat_query',
    threat_language: 'threat_query',
    threat_filters: 'threat_query',
    index: 'data_source',
    data_view_id: 'data_source',
    rule_name_override: 'rule_name_override',
    interval: 'rule_schedule',
    from: 'rule_schedule',
    to: 'rule_schedule',
    timeline_id: 'timeline_template',
    timeline_title: 'timeline_template',
    timestamp_override: 'timestamp_override',
    timestamp_override_fallback_disabled: 'timestamp_override',
  };

  // Handle query, filters and language fields based on rule type
  if (fieldName === 'query' || fieldName === 'language' || fieldName === 'filters') {
    switch (ruleType) {
      case 'query':
      case 'saved_query':
        return 'kql_query' as const;
      case 'eql':
        return 'eql_query';
      case 'esql':
        return 'esql_query';
      default:
        return 'kql_query';
    }
  }

  return diffableRuleFieldMap[fieldName] || fieldName;
}

/**
 * Maps a PrebuiltRuleAsset schema field name to its corresponding property
 * name within a DiffableRule group.
 *
 * @param {string} fieldName - The field name from the PrebuiltRuleAsset schema.
 * @returns {string} The corresponding property name in the DiffableRule group.
 *
 * @example
 * mapRuleFieldToDiffableRuleSubfield('index')
 * // Returns: 'index_patterns'
 *
 * @example
 * mapRuleFieldToDiffableRuleSubfield('from')
 * // Returns: 'lookback'
 *
 */
export function mapRuleFieldToDiffableRuleSubfield(fieldName: string): string {
  const fieldMapping: Record<string, string> = {
    index: 'index_patterns',
    data_view_id: 'data_view_id',
    saved_id: 'saved_query_id',
    building_block_type: 'type',
    rule_name_override: 'field_name',
    timestamp_override: 'field_name',
    timestamp_override_fallback_disabled: 'fallback_disabled',
    timeline_id: 'timeline_id',
    timeline_title: 'timeline_title',
    interval: 'interval',
    from: 'lookback',
    to: 'lookback',
  };

  return fieldMapping[fieldName] || fieldName;
}

type TransformValuesReturnType =
  | {
      type: 'TRANSFORMED_FIELD';
      value: unknown;
    }
  | { type: 'NON_TRANSFORMED_FIELD' };

/**
 * Transforms specific field values from the DiffableRule format to the PrebuiltRuleAsset/RuleResponse format.
 *
 * This function is used in the rule upgrade process to ensure that certain fields
 * are correctly formatted when creating the updated rules payload. It handles
 * special cases where the format differs between the DiffableRule and the
 * PrebuiltRuleAsset/RuleResponse schemas.
 *
 * @param {string} fieldName - The name of the field being processed.
 * @param {RuleSchedule | InlineKqlQuery | unknown} diffableFieldValue - The value of the field in DiffableRule format.
 *
 * @returns {TransformValuesReturnType} An object indicating whether the field was transformed
 * and its new value if applicable.
 *   - If transformed: { type: 'TRANSFORMED_FIELD', value: transformedValue }
 *   - If not transformed: { type: 'NON_TRANSFORMED_FIELD' }
 *
 * @example
 * // Transforms 'from' field
 * transformDiffableFieldValues('from', { lookback: '30d' })
 * // Returns: { type: 'TRANSFORMED_FIELD', value: 'now-30d' }
 *
 * @example
 * // Transforms 'saved_id' field for inline queries
 * transformDiffableFieldValues('saved_id', { type: 'inline_query', ... })
 * // Returns: { type: 'TRANSFORMED_FIELD', value: undefined }
 *
 */
export const transformDiffableFieldValues = (
  fieldName: string,
  diffableFieldValue: RuleSchedule | InlineKqlQuery | unknown
): TransformValuesReturnType => {
  if (fieldName === 'from' && isRuleSchedule(diffableFieldValue)) {
    return { type: 'TRANSFORMED_FIELD', value: `now-${diffableFieldValue.lookback}` };
  } else if (fieldName === 'to') {
    return { type: 'TRANSFORMED_FIELD', value: `now` };
  } else if (fieldName === 'saved_id' && isInlineQuery(diffableFieldValue)) {
    // saved_id should be set only for rules with SavedKqlQuery, undefined otherwise
    return { type: 'TRANSFORMED_FIELD', value: undefined };
  }

  return { type: 'NON_TRANSFORMED_FIELD' };
};

function isRuleSchedule(value: unknown): value is RuleSchedule {
  return typeof value === 'object' && value !== null && 'lookback' in value;
}

function isInlineQuery(value: unknown): value is InlineKqlQuery {
  return (
    typeof value === 'object' && value !== null && 'type' in value && value.type === 'inline_query'
  );
}
