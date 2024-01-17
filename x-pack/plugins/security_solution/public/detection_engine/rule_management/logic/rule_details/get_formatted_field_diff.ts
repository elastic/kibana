/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import type { AllFieldsDiff } from '../../../../../common/api/detection_engine';

const sortAndStringifyJson = (jsObject: unknown): string => stringify(jsObject, { space: 2 });

export const getFormattedFieldDiff = (
  fieldName: keyof AllFieldsDiff,
  fields: AllFieldsDiff
): Array<{ currentVersion: string; targetVersion: string; fieldName: string }> => {
  switch (fieldName) {
    case 'name':
    case 'description':
    case 'license':
    case 'note':
    case 'setup':
    case 'event_category_override':
    case 'timestamp_field':
    case 'tiebreaker_field':
    case 'threat_indicator_path':
    case 'history_window_start':
    case 'type':
      return [
        {
          fieldName,
          currentVersion: fields[fieldName].current_version,
          targetVersion: fields[fieldName].target_version,
        },
      ];
    case 'data_source':
      const dataSourceObj = fields[fieldName];
      return [
        {
          fieldName: 'Type',
          currentVersion: fields[fieldName].current_version?.type,
          targetVersion: fields[fieldName].target_version?.type,
        },
        {
          fieldName: 'Index Patterns',
          currentVersion: sortAndStringifyJson(
            dataSourceObj.current_version.index_patterns ?? undefined
          ),
          targetVersion: sortAndStringifyJson(
            dataSourceObj.target_version.index_patterns ?? undefined
          ),
        },
        {
          fieldName: 'Data View ID',
          currentVersion: dataSourceObj.current_version.data_view_id ?? undefined,
          targetVersion: dataSourceObj.target_version.data_view_id ?? undefined,
        },
      ];
    case 'eql_query':
      return [
        {
          fieldName: 'Query',
          currentVersion: fields[fieldName].current_version.query,
          targetVersion: fields[fieldName].target_version.query,
        },
        {
          fieldName: 'Filters',
          currentVersion: sortAndStringifyJson(fields[fieldName].current_version.filters),
          targetVersion: sortAndStringifyJson(fields[fieldName].target_version.filters),
        },
        {
          fieldName: 'Language',
          currentVersion: fields[fieldName].current_version.language,
          targetVersion: fields[fieldName].target_version.language,
        },
      ];
    case 'kql_query':
      return [
        {
          fieldName: 'Query',
          currentVersion: fields[fieldName].current_version.query,
          targetVersion: fields[fieldName].target_version.query,
        },
        {
          fieldName: 'Filters',
          currentVersion: sortAndStringifyJson(fields[fieldName].current_version.filters),
          targetVersion: sortAndStringifyJson(fields[fieldName].target_version.filters),
        },
        {
          fieldName: 'Language',
          currentVersion: fields[fieldName].current_version.language,
          targetVersion: fields[fieldName].target_version.language,
        },
        {
          fieldName: 'Type',
          currentVersion: fields[fieldName].current_version.type,
          targetVersion: fields[fieldName].target_version.type,
        },
      ];

    default:
      return [
        {
          fieldName,
          currentVersion: sortAndStringifyJson(fields[fieldName].current_version),
          targetVersion: sortAndStringifyJson(fields[fieldName].target_version),
        },
      ];
  }
};
