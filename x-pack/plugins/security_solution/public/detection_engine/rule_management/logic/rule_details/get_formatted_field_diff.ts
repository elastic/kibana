/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import type { AllFieldsDiff } from '../../../../../common/api/detection_engine';
import { DataSourceType } from '../../../../../common/api/detection_engine';

const sortAndStringifyJson = (jsObject: Record<string, unknown>): string =>
  stringify(jsObject, { space: 2 });

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
    case 'version':
    case 'max_signals':
    case 'anomaly_threshold':
      return [
        {
          fieldName,
          currentVersion: fields[fieldName].current_version.toString(),
          targetVersion: fields[fieldName].target_version.toString(),
        },
      ];
    case 'eql_query':
      return [
        {
          fieldName: 'query',
          currentVersion: fields[fieldName].current_version.query,
          targetVersion: fields[fieldName].target_version.query,
        },
        {
          fieldName: 'filters',
          currentVersion: sortAndStringifyJson(fields[fieldName].current_version.filters),
          targetVersion: sortAndStringifyJson(fields[fieldName].target_version.filters),
        },
        {
          fieldName: 'language',
          currentVersion: fields[fieldName].current_version.language,
          targetVersion: fields[fieldName].target_version.language,
        },
      ];

    //   case 'data_source':
    //     if(fields[fieldName].current_version?.type === DataSourceType.index_patterns){
    //         currentVersion = fields[fieldName].current_version.;

    //     }
    //     targetVersion = fields[fieldName].target_version;
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
