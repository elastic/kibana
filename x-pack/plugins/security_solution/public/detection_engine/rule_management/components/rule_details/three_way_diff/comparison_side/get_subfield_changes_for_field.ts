/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import type {
  BuildingBlockObject,
  InlineKqlQuery,
  RuleDataSource,
  RuleEqlQuery,
  RuleEsqlQuery,
  RuleKqlQuery,
  RuleNameOverrideObject,
  RuleSchedule,
  Threshold,
  TimelineTemplateReference,
  TimestampOverrideObject,
} from '../../../../../../../common/api/detection_engine';
import type { SubfieldChange } from './types';

export const sortAndStringifyJson = (fieldValue: unknown): string => {
  if (fieldValue === undefined) {
    return '';
  }

  if (typeof fieldValue === 'string') {
    return fieldValue;
  }

  return stringify(fieldValue, { space: 2 });
};

export const getSubfieldChangesForDataSource = (
  oldFieldValue?: RuleDataSource,
  newFieldValue?: RuleDataSource
): SubfieldChange[] => {
  const oldType = sortAndStringifyJson(oldFieldValue?.type);
  const newType = sortAndStringifyJson(newFieldValue?.type);

  const oldIndexPatterns = sortAndStringifyJson(
    oldFieldValue?.type === 'index_patterns' ? oldFieldValue?.index_patterns : ''
  );
  const newIndexPatterns = sortAndStringifyJson(
    newFieldValue?.type === 'index_patterns' ? newFieldValue?.index_patterns : ''
  );

  const oldDataViewId = sortAndStringifyJson(
    oldFieldValue?.type === 'data_view' ? oldFieldValue?.data_view_id : ''
  );
  const newDataViewId = sortAndStringifyJson(
    newFieldValue?.type === 'data_view' ? newFieldValue?.data_view_id : ''
  );

  const hasTypeChanged = oldType !== newType;

  return [
    ...(hasTypeChanged
      ? [
          {
            subfieldName: 'type',
            oldSubfieldValue: oldType,
            newSubfieldValue: newType,
          },
        ]
      : []),
    ...(oldIndexPatterns !== newIndexPatterns
      ? [
          {
            subfieldName: 'index_patterns',
            oldSubfieldValue: oldIndexPatterns,
            newSubfieldValue: newIndexPatterns,
          },
        ]
      : []),
    ...(oldDataViewId !== newDataViewId
      ? [
          {
            subfieldName: 'data_view_id',
            oldSubfieldValue: oldDataViewId,
            newSubfieldValue: newDataViewId,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForKqlQuery = (
  oldFieldValue?: RuleKqlQuery,
  newFieldValue?: RuleKqlQuery
): SubfieldChange[] => {
  const oldType = sortAndStringifyJson(oldFieldValue?.type);
  const newType = sortAndStringifyJson(newFieldValue?.type);

  const oldQuery = sortAndStringifyJson(
    oldFieldValue?.type === 'inline_query' ? oldFieldValue?.query : ''
  );
  const newQuery = sortAndStringifyJson(
    newFieldValue?.type === 'inline_query' ? newFieldValue?.query : ''
  );

  const oldLanguage = sortAndStringifyJson(
    oldFieldValue?.type === 'inline_query' ? oldFieldValue?.language : ''
  );
  const newLanguage = sortAndStringifyJson(
    newFieldValue?.type === 'inline_query' ? newFieldValue?.language : ''
  );

  const oldFilters = sortAndStringifyJson(
    oldFieldValue?.type === 'inline_query' ? oldFieldValue?.filters : ''
  );
  const newFilters = sortAndStringifyJson(
    newFieldValue?.type === 'inline_query' ? newFieldValue?.filters : ''
  );

  const oldSavedQueryId = sortAndStringifyJson(
    oldFieldValue?.type === 'saved_query' ? oldFieldValue?.saved_query_id : ''
  );
  const newSavedQueryId = sortAndStringifyJson(
    newFieldValue?.type === 'saved_query' ? newFieldValue?.saved_query_id : ''
  );

  const hasTypeChanged = oldType !== newType;

  return [
    ...(hasTypeChanged
      ? [
          {
            subfieldName: 'type',
            oldSubfieldValue: oldType,
            newSubfieldValue: newType,
          },
        ]
      : []),
    ...(oldQuery !== newQuery
      ? [
          {
            subfieldName: 'query',
            oldSubfieldValue: oldQuery,
            newSubfieldValue: newQuery,
          },
        ]
      : []),
    ...(oldLanguage !== newLanguage
      ? [
          {
            subfieldName: 'language',
            oldSubfieldValue: oldLanguage,
            newSubfieldValue: newLanguage,
          },
        ]
      : []),
    ...(oldFilters !== newFilters
      ? [
          {
            subfieldName: 'filters',
            oldSubfieldValue: oldFilters,
            newSubfieldValue: newFilters,
          },
        ]
      : []),
    ...(oldSavedQueryId !== newSavedQueryId
      ? [
          {
            subfieldName: 'saved_query_id',
            oldSubfieldValue: oldSavedQueryId,
            newSubfieldValue: newSavedQueryId,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForEqlQuery = (
  oldFieldValue?: RuleEqlQuery,
  newFieldValue?: RuleEqlQuery
): SubfieldChange[] => {
  const oldQuery = sortAndStringifyJson(oldFieldValue?.query);
  const newQuery = sortAndStringifyJson(newFieldValue?.query);

  const oldFilters = sortAndStringifyJson(oldFieldValue?.filters);
  const newFilters = sortAndStringifyJson(newFieldValue?.filters);

  return [
    ...(oldQuery !== newQuery
      ? [
          {
            subfieldName: 'query',
            oldSubfieldValue: oldQuery,
            newSubfieldValue: newQuery,
          },
        ]
      : []),
    ...(oldFilters !== newFilters
      ? [
          {
            subfieldName: 'filters',
            oldSubfieldValue: oldFilters,
            newSubfieldValue: newFilters,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForEsqlQuery = (
  oldFieldValue?: RuleEsqlQuery,
  newFieldValue?: RuleEsqlQuery
): SubfieldChange[] => {
  const oldQuery = sortAndStringifyJson(oldFieldValue?.query);
  const newQuery = sortAndStringifyJson(newFieldValue?.query);

  const oldLanguage = sortAndStringifyJson(oldFieldValue?.language);
  const newLanguage = sortAndStringifyJson(oldFieldValue?.language);

  return [
    ...(oldQuery !== newQuery
      ? [
          {
            subfieldName: 'query',
            oldSubfieldValue: oldQuery,
            newSubfieldValue: newQuery,
          },
        ]
      : []),
    ...(oldLanguage !== newLanguage
      ? [
          {
            subfieldName: 'language',
            oldSubfieldValue: oldLanguage,
            newSubfieldValue: newLanguage,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForThreatQuery = (
  oldFieldValue?: InlineKqlQuery,
  newFieldValue?: InlineKqlQuery
): SubfieldChange[] => {
  const oldQuery = sortAndStringifyJson(oldFieldValue?.query);
  const newQuery = sortAndStringifyJson(newFieldValue?.query);

  const oldLanguage = sortAndStringifyJson(oldFieldValue?.language);
  const newLanguage = sortAndStringifyJson(newFieldValue?.language);

  const oldFilters = sortAndStringifyJson(oldFieldValue?.filters);
  const newFilters = sortAndStringifyJson(newFieldValue?.filters);

  return [
    ...(oldQuery !== newQuery
      ? [
          {
            subfieldName: 'query',
            oldSubfieldValue: oldQuery,
            newSubfieldValue: newQuery,
          },
        ]
      : []),
    ...(oldLanguage !== newLanguage
      ? [
          {
            subfieldName: 'language',
            oldSubfieldValue: oldLanguage,
            newSubfieldValue: newLanguage,
          },
        ]
      : []),
    ...(oldFilters !== newFilters
      ? [
          {
            subfieldName: 'filters',
            oldSubfieldValue: oldFilters,
            newSubfieldValue: newFilters,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForRuleSchedule = (
  oldFieldValue?: RuleSchedule,
  newFieldValue?: RuleSchedule
): SubfieldChange[] => {
  return [
    ...(oldFieldValue?.interval !== newFieldValue?.interval
      ? [
          {
            subfieldName: 'interval',
            oldSubfieldValue: sortAndStringifyJson(oldFieldValue?.interval),
            newSubfieldValue: sortAndStringifyJson(newFieldValue?.interval),
          },
        ]
      : []),
    ...(oldFieldValue?.lookback !== newFieldValue?.lookback
      ? [
          {
            subfieldName: 'lookback',
            oldSubfieldValue: sortAndStringifyJson(oldFieldValue?.lookback),
            newSubfieldValue: sortAndStringifyJson(newFieldValue?.lookback),
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForRuleNameOverride = (
  oldFieldValue?: RuleNameOverrideObject,
  newFieldValue?: RuleNameOverrideObject
): SubfieldChange[] => {
  const oldFieldName = sortAndStringifyJson(oldFieldValue?.field_name);
  const newFieldName = sortAndStringifyJson(newFieldValue?.field_name);

  return [
    ...(oldFieldName !== newFieldName
      ? [
          {
            subfieldName: 'field_name',
            oldSubfieldValue: oldFieldName,
            newSubfieldValue: newFieldName,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForTimestampOverride = (
  oldFieldValue?: TimestampOverrideObject,
  newFieldValue?: TimestampOverrideObject
): SubfieldChange[] => {
  const oldFieldName = sortAndStringifyJson(oldFieldValue?.field_name);
  const newFieldName = sortAndStringifyJson(newFieldValue?.field_name);

  const oldVersionFallbackDisabled = sortAndStringifyJson(oldFieldValue?.fallback_disabled);
  const newVersionFallbackDisabled = sortAndStringifyJson(newFieldValue?.fallback_disabled);

  return [
    ...(oldFieldName !== newFieldName
      ? [
          {
            subfieldName: 'field_name',
            oldSubfieldValue: oldFieldName,
            newSubfieldValue: newFieldName,
          },
        ]
      : []),
    ...(oldVersionFallbackDisabled !== newVersionFallbackDisabled
      ? [
          {
            subfieldName: 'fallback_disabled',
            oldSubfieldValue: oldVersionFallbackDisabled,
            newSubfieldValue: newVersionFallbackDisabled,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForTimelineTemplate = (
  oldFieldValue?: TimelineTemplateReference,
  newFieldValue?: TimelineTemplateReference
): SubfieldChange[] => {
  const oldTimelineId = sortAndStringifyJson(oldFieldValue?.timeline_id);
  const newTimelineId = sortAndStringifyJson(newFieldValue?.timeline_id);

  const oldTimelineTitle = sortAndStringifyJson(oldFieldValue?.timeline_title);
  const newTimelineTitle = sortAndStringifyJson(newFieldValue?.timeline_title);

  return [
    ...(oldTimelineId !== newTimelineId
      ? [
          {
            subfieldName: 'timeline_id',
            oldSubfieldValue: oldTimelineId,
            newSubfieldValue: newTimelineId,
          },
        ]
      : []),
    ...(oldTimelineTitle !== newTimelineTitle
      ? [
          {
            subfieldName: 'timeline_title',
            oldSubfieldValue: oldTimelineTitle,
            newSubfieldValue: newTimelineTitle,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForBuildingBlock = (
  oldFieldValue?: BuildingBlockObject,
  newFieldValue?: BuildingBlockObject
): SubfieldChange[] => {
  const oldType = sortAndStringifyJson(oldFieldValue?.type);
  const newType = sortAndStringifyJson(newFieldValue?.type);

  return [
    ...(oldType !== newType
      ? [
          {
            subfieldName: 'type',
            oldSubfieldValue: oldType,
            newSubfieldValue: newType,
          },
        ]
      : []),
  ];
};

export const getSubfieldChangesForThreshold = (
  oldFieldValue?: Threshold,
  newFieldValue?: Threshold
): SubfieldChange[] => {
  const oldField = sortAndStringifyJson(oldFieldValue?.field);
  const newField = sortAndStringifyJson(newFieldValue?.field);

  const oldValue = sortAndStringifyJson(oldFieldValue?.value);
  const newValue = sortAndStringifyJson(newFieldValue?.value);

  const oldCardinality = sortAndStringifyJson(oldFieldValue?.cardinality);
  const newCardinality = sortAndStringifyJson(newFieldValue?.cardinality);

  return [
    ...(oldField !== newField
      ? [
          {
            subfieldName: 'field',
            oldSubfieldValue: oldField,
            newSubfieldValue: newField,
          },
        ]
      : []),
    ...(oldValue !== newValue
      ? [
          {
            subfieldName: 'value',
            oldSubfieldValue: oldValue,
            newSubfieldValue: newValue,
          },
        ]
      : []),
    ...(oldCardinality !== newCardinality
      ? [
          {
            subfieldName: 'cardinality',
            oldSubfieldValue: oldCardinality,
            newSubfieldValue: newCardinality,
          },
        ]
      : []),
  ];
};
