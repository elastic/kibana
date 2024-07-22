/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import type {
  AllFieldsDiff,
  RuleFieldsDiffWithDataSource,
  RuleFieldsDiffWithEqlQuery,
  RuleFieldsDiffWithEsqlQuery,
  RuleFieldsDiffWithKqlQuery,
} from '../../../../../../common/api/detection_engine';
import type { FieldDiff } from '../../../model/rule_details/rule_field_diff';

export const sortAndStringifyJson = (fieldValue: unknown): string => {
  if (!fieldValue) {
    return ''; // The JSON diff package we use does not accept `undefined` as a valid entry, empty string renders the equivalent of no field
  }

  if (typeof fieldValue === 'string') {
    return fieldValue;
  }
  return stringify(fieldValue, { space: 2 });
};

export const getFieldDiffsForDataSource = (
  dataSourceThreeWayDiff: RuleFieldsDiffWithDataSource['data_source']
): FieldDiff[] => {
  const currentType = sortAndStringifyJson(dataSourceThreeWayDiff.current_version?.type);
  const targetType = sortAndStringifyJson(dataSourceThreeWayDiff.target_version?.type);

  const currentIndexPatterns = sortAndStringifyJson(
    dataSourceThreeWayDiff.current_version?.type === 'index_patterns' &&
      dataSourceThreeWayDiff.current_version?.index_patterns
  );
  const targetIndexPatterns = sortAndStringifyJson(
    dataSourceThreeWayDiff.target_version?.type === 'index_patterns' &&
      dataSourceThreeWayDiff.target_version?.index_patterns
  );
  const currentDataViewId = sortAndStringifyJson(
    dataSourceThreeWayDiff.current_version?.type === 'data_view' &&
      dataSourceThreeWayDiff.current_version?.data_view_id
  );
  const targetDataViewId = sortAndStringifyJson(
    dataSourceThreeWayDiff.target_version?.type === 'data_view' &&
      dataSourceThreeWayDiff.target_version?.data_view_id
  );

  const hasTypeChanged = currentType !== targetType;
  return [
    ...(hasTypeChanged
      ? [
          {
            fieldName: 'type',
            currentVersion: currentType,
            targetVersion: targetType,
          },
        ]
      : []),
    ...(currentIndexPatterns !== targetIndexPatterns
      ? [
          {
            fieldName: 'index_patterns',
            currentVersion: currentIndexPatterns,
            targetVersion: targetIndexPatterns,
          },
        ]
      : []),
    ...(currentDataViewId !== targetDataViewId
      ? [
          {
            fieldName: 'data_view_id',
            currentVersion: currentDataViewId,
            targetVersion: targetDataViewId,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForKqlQuery = (
  kqlQueryThreeWayDiff: RuleFieldsDiffWithKqlQuery['kql_query']
): FieldDiff[] => {
  const currentType = sortAndStringifyJson(kqlQueryThreeWayDiff.current_version?.type);
  const targetType = sortAndStringifyJson(kqlQueryThreeWayDiff.target_version?.type);

  const currentQuery = sortAndStringifyJson(
    kqlQueryThreeWayDiff.current_version?.type === 'inline_query' &&
      kqlQueryThreeWayDiff.current_version?.query
  );
  const targetQuery = sortAndStringifyJson(
    kqlQueryThreeWayDiff.target_version?.type === 'inline_query' &&
      kqlQueryThreeWayDiff.target_version?.query
  );

  const currentLanguage = sortAndStringifyJson(
    kqlQueryThreeWayDiff.current_version?.type === 'inline_query' &&
      kqlQueryThreeWayDiff.current_version?.language
  );
  const targetLanguage = sortAndStringifyJson(
    kqlQueryThreeWayDiff.target_version?.type === 'inline_query' &&
      kqlQueryThreeWayDiff.target_version?.language
  );

  const currentFilters = sortAndStringifyJson(
    kqlQueryThreeWayDiff.current_version?.type === 'inline_query' &&
      kqlQueryThreeWayDiff.current_version?.filters
  );
  const targetFilters = sortAndStringifyJson(
    kqlQueryThreeWayDiff.target_version?.type === 'inline_query' &&
      kqlQueryThreeWayDiff.target_version?.filters
  );

  const currentSavedQueryId = sortAndStringifyJson(
    kqlQueryThreeWayDiff.current_version?.type === 'saved_query' &&
      kqlQueryThreeWayDiff.current_version?.saved_query_id
  );
  const targetSavedQueryId = sortAndStringifyJson(
    kqlQueryThreeWayDiff.target_version?.type === 'saved_query' &&
      kqlQueryThreeWayDiff.target_version?.saved_query_id
  );

  const hasTypeChanged = currentType !== targetType;

  return [
    ...(hasTypeChanged
      ? [
          {
            fieldName: 'type',
            currentVersion: currentType,
            targetVersion: targetType,
          },
        ]
      : []),
    ...(currentQuery !== targetQuery
      ? [
          {
            fieldName: 'query',
            currentVersion: currentQuery,
            targetVersion: targetQuery,
          },
        ]
      : []),
    ...(currentLanguage !== targetLanguage
      ? [
          {
            fieldName: 'language',
            currentVersion: currentLanguage,
            targetVersion: targetLanguage,
          },
        ]
      : []),
    ...(currentFilters !== targetFilters
      ? [
          {
            fieldName: 'filters',
            currentVersion: currentFilters,
            targetVersion: targetFilters,
          },
        ]
      : []),
    ...(currentSavedQueryId !== targetSavedQueryId
      ? [
          {
            fieldName: 'saved_query_id',
            currentVersion: currentSavedQueryId,
            targetVersion: targetSavedQueryId,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForEqlQuery = (
  eqlQuery: RuleFieldsDiffWithEqlQuery['eql_query']
): FieldDiff[] => {
  const currentQuery = sortAndStringifyJson(eqlQuery.current_version?.query);
  const targetQuery = sortAndStringifyJson(eqlQuery.target_version?.query);

  const currentFilters = sortAndStringifyJson(eqlQuery.current_version?.filters);
  const targetFilters = sortAndStringifyJson(eqlQuery.target_version?.filters);
  return [
    ...(currentQuery !== targetQuery
      ? [
          {
            fieldName: 'query',
            currentVersion: currentQuery,
            targetVersion: targetQuery,
          },
        ]
      : []),
    ...(currentFilters !== targetFilters
      ? [
          {
            fieldName: 'filters',
            currentVersion: currentFilters,
            targetVersion: targetFilters,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForEsqlQuery = (
  esqlQuery: RuleFieldsDiffWithEsqlQuery['esql_query']
): FieldDiff[] => {
  const currentQuery = sortAndStringifyJson(esqlQuery.current_version?.query);
  const targetQuery = sortAndStringifyJson(esqlQuery.target_version?.query);

  const currentLanguage = sortAndStringifyJson(esqlQuery.current_version?.language);
  const targetLanguage = sortAndStringifyJson(esqlQuery.target_version?.language);
  return [
    ...(currentQuery !== targetQuery
      ? [
          {
            fieldName: 'query',
            currentVersion: currentQuery,
            targetVersion: targetQuery,
          },
        ]
      : []),
    ...(currentLanguage !== targetLanguage
      ? [
          {
            fieldName: 'language',
            currentVersion: currentLanguage,
            targetVersion: targetLanguage,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForThreatQuery = (
  threatQuery: AllFieldsDiff['threat_query']
): FieldDiff[] => {
  const currentQuery = sortAndStringifyJson(threatQuery.current_version?.query);
  const targetQuery = sortAndStringifyJson(threatQuery.target_version?.query);

  const currentLanguage = sortAndStringifyJson(threatQuery.current_version?.language);
  const targetLanguage = sortAndStringifyJson(threatQuery.target_version?.language);

  const currentFilters = sortAndStringifyJson(threatQuery.current_version?.filters);
  const targetFilters = sortAndStringifyJson(threatQuery.target_version?.filters);
  return [
    ...(currentQuery !== targetQuery
      ? [
          {
            fieldName: 'query',
            currentVersion: currentQuery,
            targetVersion: targetQuery,
          },
        ]
      : []),
    ...(currentLanguage !== targetLanguage
      ? [
          {
            fieldName: 'language',
            currentVersion: currentLanguage,
            targetVersion: targetLanguage,
          },
        ]
      : []),
    ...(currentFilters !== targetFilters
      ? [
          {
            fieldName: 'filters',
            currentVersion: currentFilters,
            targetVersion: targetFilters,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForRuleSchedule = (
  ruleScheduleThreeWayDiff: AllFieldsDiff['rule_schedule']
): FieldDiff[] => {
  return [
    ...(ruleScheduleThreeWayDiff.current_version?.interval !==
    ruleScheduleThreeWayDiff.target_version?.interval
      ? [
          {
            fieldName: 'interval',
            currentVersion: sortAndStringifyJson(
              ruleScheduleThreeWayDiff.current_version?.interval
            ),
            targetVersion: sortAndStringifyJson(ruleScheduleThreeWayDiff.target_version?.interval),
          },
        ]
      : []),
    ...(ruleScheduleThreeWayDiff.current_version?.lookback !==
    ruleScheduleThreeWayDiff.target_version?.lookback
      ? [
          {
            fieldName: 'lookback',
            currentVersion: sortAndStringifyJson(
              ruleScheduleThreeWayDiff.current_version?.lookback
            ),
            targetVersion: sortAndStringifyJson(ruleScheduleThreeWayDiff.target_version?.lookback),
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForRuleNameOverride = (
  ruleNameOverrideThreeWayDiff: AllFieldsDiff['rule_name_override']
): FieldDiff[] => {
  const currentFieldName = sortAndStringifyJson(
    ruleNameOverrideThreeWayDiff.current_version?.field_name
  );
  const targetFieldName = sortAndStringifyJson(
    ruleNameOverrideThreeWayDiff.target_version?.field_name
  );
  return [
    ...(currentFieldName !== targetFieldName
      ? [
          {
            fieldName: 'field_name',
            currentVersion: currentFieldName,
            targetVersion: targetFieldName,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForTimestampOverride = (
  timestampOverrideThreeWayDiff: AllFieldsDiff['timestamp_override']
): FieldDiff[] => {
  const currentFieldName = sortAndStringifyJson(
    timestampOverrideThreeWayDiff.current_version?.field_name
  );
  const targetFieldName = sortAndStringifyJson(
    timestampOverrideThreeWayDiff.target_version?.field_name
  );
  const currentVersionFallbackDisabled = sortAndStringifyJson(
    timestampOverrideThreeWayDiff.current_version?.fallback_disabled
  );
  const targetVersionFallbackDisabled = sortAndStringifyJson(
    timestampOverrideThreeWayDiff.target_version?.fallback_disabled
  );

  return [
    ...(currentFieldName !== targetFieldName
      ? [
          {
            fieldName: 'field_name',
            currentVersion: currentFieldName,
            targetVersion: targetFieldName,
          },
        ]
      : []),
    ...(currentVersionFallbackDisabled !== targetVersionFallbackDisabled
      ? [
          {
            fieldName: 'fallback_disabled',
            currentVersion: currentVersionFallbackDisabled,
            targetVersion: targetVersionFallbackDisabled,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForTimelineTemplate = (
  timelineTemplateThreeWayDiff: AllFieldsDiff['timeline_template']
): FieldDiff[] => {
  const currentTimelineId = sortAndStringifyJson(
    timelineTemplateThreeWayDiff.current_version?.timeline_id
  );
  const targetTimelineId = sortAndStringifyJson(
    timelineTemplateThreeWayDiff.target_version?.timeline_id
  );

  const currentTimelineTitle = sortAndStringifyJson(
    timelineTemplateThreeWayDiff.current_version?.timeline_title
  );
  const targetTimelineTitle = sortAndStringifyJson(
    timelineTemplateThreeWayDiff.target_version?.timeline_title
  );
  return [
    ...(currentTimelineId !== targetTimelineId
      ? [
          {
            fieldName: 'timeline_id',
            currentVersion: currentTimelineId,
            targetVersion: targetTimelineId,
          },
        ]
      : []),
    ...(currentTimelineTitle !== targetTimelineTitle
      ? [
          {
            fieldName: 'timeline_title',
            currentVersion: currentTimelineTitle,
            targetVersion: targetTimelineTitle,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForBuildingBlock = (
  buildingBlockThreeWayDiff: AllFieldsDiff['building_block']
): FieldDiff[] => {
  const currentType = sortAndStringifyJson(buildingBlockThreeWayDiff.current_version?.type);
  const targetType = sortAndStringifyJson(buildingBlockThreeWayDiff.target_version?.type);
  return [
    ...(currentType !== targetType
      ? [
          {
            fieldName: 'type',
            currentVersion: currentType,
            targetVersion: targetType,
          },
        ]
      : []),
  ];
};

export const getFieldDiffsForThreshold = (
  thresholdThreeWayDiff: AllFieldsDiff['threshold']
): FieldDiff[] => {
  const currentField = sortAndStringifyJson(thresholdThreeWayDiff.current_version?.field);
  const targetField = sortAndStringifyJson(thresholdThreeWayDiff.target_version?.field);
  const currentValue = sortAndStringifyJson(thresholdThreeWayDiff.current_version?.value);
  const targetValue = sortAndStringifyJson(thresholdThreeWayDiff.target_version?.value);
  const currentCardinality = sortAndStringifyJson(
    thresholdThreeWayDiff.current_version?.cardinality
  );
  const targetCardinality = sortAndStringifyJson(thresholdThreeWayDiff.target_version?.cardinality);

  return [
    ...(currentField !== targetField
      ? [
          {
            fieldName: 'field',
            currentVersion: currentField,
            targetVersion: targetField,
          },
        ]
      : []),
    ...(currentValue !== targetValue
      ? [
          {
            fieldName: 'value',
            currentVersion: currentValue,
            targetVersion: targetValue,
          },
        ]
      : []),
    ...(currentCardinality !== targetCardinality
      ? [
          {
            fieldName: 'cardinality',
            currentVersion: currentCardinality,
            targetVersion: targetCardinality,
          },
        ]
      : []),
  ];
};
