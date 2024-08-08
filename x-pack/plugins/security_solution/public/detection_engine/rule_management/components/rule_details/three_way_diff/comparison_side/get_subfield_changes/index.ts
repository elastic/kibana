/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableAllFields } from '../../../../../../../../common/api/detection_engine';
import { stringifyToSortedJson } from '../utils';
import { getSubfieldChangesForDataSource } from './data_source';
import { getSubfieldChangesForKqlQuery } from './kql_query';
import { getSubfieldChangesForEqlQuery } from './eql_query';
import { getSubfieldChangesForEsqlQuery } from './esql_query';
import { getSubfieldChangesForThreatQuery } from './threat_query';
import { getSubfieldChangesForRuleSchedule } from './rule_schedule';
import { getSubfieldChangesForRuleNameOverride } from './rule_name_override';
import { getSubfieldChangesForTimestampOverride } from './timestamp_override';
import { getSubfieldChangesForTimelineTemplate } from './timeline_template';
import { getSubfieldChangesForBuildingBlock } from './building_block';
import { getSubfieldChangesForThreshold } from './threshold';
import type { SubfieldChanges } from '../types';

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
): SubfieldChanges => {
  switch (fieldName) {
    /*
      Typecasting `oldFieldValue` and `newFieldValue` to corresponding field
      type `DiffableAllFields[*]` is required here since `oldFieldValue` and
      `newFieldValue` concrete types depend on `fieldName` but TS doesn't track that.
    */
    case 'data_source':
      return getSubfieldChangesForDataSource(
        oldFieldValue as DiffableAllFields['data_source'],
        newFieldValue as DiffableAllFields['data_source']
      );
    case 'kql_query':
      return getSubfieldChangesForKqlQuery(
        oldFieldValue as DiffableAllFields['kql_query'],
        newFieldValue as DiffableAllFields['kql_query']
      );
    case 'eql_query':
      return getSubfieldChangesForEqlQuery(
        oldFieldValue as DiffableAllFields['eql_query'],
        newFieldValue as DiffableAllFields['eql_query']
      );
    case 'esql_query':
      return getSubfieldChangesForEsqlQuery(
        oldFieldValue as DiffableAllFields['esql_query'],
        newFieldValue as DiffableAllFields['esql_query']
      );
    case 'threat_query':
      return getSubfieldChangesForThreatQuery(
        oldFieldValue as DiffableAllFields['threat_query'],
        newFieldValue as DiffableAllFields['threat_query']
      );
    case 'rule_schedule':
      return getSubfieldChangesForRuleSchedule(
        oldFieldValue as DiffableAllFields['rule_schedule'],
        newFieldValue as DiffableAllFields['rule_schedule']
      );
    case 'rule_name_override':
      return getSubfieldChangesForRuleNameOverride(
        oldFieldValue as DiffableAllFields['rule_name_override'],
        newFieldValue as DiffableAllFields['rule_name_override']
      );
    case 'timestamp_override':
      return getSubfieldChangesForTimestampOverride(
        oldFieldValue as DiffableAllFields['timestamp_override'],
        newFieldValue as DiffableAllFields['timestamp_override']
      );
    case 'timeline_template':
      return getSubfieldChangesForTimelineTemplate(
        oldFieldValue as DiffableAllFields['timeline_template'],
        newFieldValue as DiffableAllFields['timeline_template']
      );
    case 'building_block':
      return getSubfieldChangesForBuildingBlock(
        oldFieldValue as DiffableAllFields['building_block'],
        newFieldValue as DiffableAllFields['building_block']
      );
    case 'threshold':
      return getSubfieldChangesForThreshold(
        oldFieldValue as DiffableAllFields['threshold'],
        newFieldValue as DiffableAllFields['threshold']
      );
    default:
      const oldFieldValueStringified = stringifyToSortedJson(oldFieldValue);
      const newFieldValueStringified = stringifyToSortedJson(newFieldValue);

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
