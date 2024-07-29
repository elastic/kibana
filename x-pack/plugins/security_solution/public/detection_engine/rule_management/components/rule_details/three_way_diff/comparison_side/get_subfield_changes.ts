/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleKqlQuery,
  RuleDataSource,
  RuleEqlQuery,
  RuleEsqlQuery,
  InlineKqlQuery,
  RuleSchedule,
  RuleNameOverrideObject,
  TimestampOverrideObject,
  TimelineTemplateReference,
  BuildingBlockObject,
  Threshold,
  DiffableAllFields,
} from '../../../../../../../common/api/detection_engine';
import {
  sortAndStringifyJson,
  getSubfieldChangesForDataSource,
  getSubfieldChangesForKqlQuery,
  getSubfieldChangesForEqlQuery,
  getSubfieldChangesForRuleSchedule,
  getSubfieldChangesForRuleNameOverride,
  getSubfieldChangesForTimestampOverride,
  getSubfieldChangesForTimelineTemplate,
  getSubfieldChangesForBuildingBlock,
  getSubfieldChangesForThreshold,
  getSubfieldChangesForEsqlQuery,
  getSubfieldChangesForThreatQuery,
} from './get_subfield_changes_for_field';
import type { SubfieldChange } from './types';

/**
 * Splits a field into subfields and returns the changes between the old and new subfield values.
 *
 * @param fieldName - The name of the field for which subfield changes are to be computed.
 * @param oldFieldValue - The old value of the field.
 * @param newFieldValue - The new value of the field.
 * @returns - An array of subfield changes.
 */
export const getSubfieldChanges = <FieldName extends keyof DiffableAllFields>(
  fieldName: FieldName,
  oldFieldValue?: DiffableAllFields[FieldName],
  newFieldValue?: DiffableAllFields[FieldName]
): SubfieldChange[] => {
  switch (fieldName) {
    case 'data_source':
      return getSubfieldChangesForDataSource(
        oldFieldValue as RuleDataSource | undefined,
        newFieldValue as RuleDataSource | undefined
      );
    case 'kql_query':
      return getSubfieldChangesForKqlQuery(
        oldFieldValue as RuleKqlQuery | undefined,
        newFieldValue as RuleKqlQuery | undefined
      );
    case 'eql_query':
      return getSubfieldChangesForEqlQuery(
        oldFieldValue as RuleEqlQuery | undefined,
        newFieldValue as RuleEqlQuery | undefined
      );
    case 'esql_query':
      return getSubfieldChangesForEsqlQuery(
        oldFieldValue as RuleEsqlQuery | undefined,
        newFieldValue as RuleEsqlQuery | undefined
      );
    case 'threat_query':
      return getSubfieldChangesForThreatQuery(
        oldFieldValue as InlineKqlQuery | undefined,
        newFieldValue as InlineKqlQuery | undefined
      );
    case 'rule_schedule':
      return getSubfieldChangesForRuleSchedule(
        oldFieldValue as RuleSchedule | undefined,
        newFieldValue as RuleSchedule | undefined
      );
    case 'rule_name_override':
      return getSubfieldChangesForRuleNameOverride(
        oldFieldValue as RuleNameOverrideObject | undefined,
        newFieldValue as RuleNameOverrideObject | undefined
      );
    case 'timestamp_override':
      return getSubfieldChangesForTimestampOverride(
        oldFieldValue as TimestampOverrideObject | undefined,
        newFieldValue as TimestampOverrideObject | undefined
      );
    case 'timeline_template':
      return getSubfieldChangesForTimelineTemplate(
        oldFieldValue as TimelineTemplateReference | undefined,
        newFieldValue as TimelineTemplateReference | undefined
      );
    case 'building_block':
      return getSubfieldChangesForBuildingBlock(
        oldFieldValue as BuildingBlockObject | undefined,
        newFieldValue as BuildingBlockObject | undefined
      );
    case 'threshold':
      return getSubfieldChangesForThreshold(
        oldFieldValue as Threshold | undefined,
        newFieldValue as Threshold | undefined
      );
    default:
      const oldFieldValueStringified = sortAndStringifyJson(oldFieldValue);
      const newFieldValueStringified = sortAndStringifyJson(newFieldValue);

      if (oldFieldValueStringified === newFieldValueStringified) {
        return [];
      }

      return [
        {
          subfieldName: fieldName,
          oldSubfieldValue: oldFieldValueStringified,
          newSubfieldValue: newFieldValueStringified,
        },
      ];
  }
};
