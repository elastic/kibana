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

export const getFormattedFieldDiff = (fieldName: keyof AllFieldsDiff, fields: AllFieldsDiff) => {
  let currentVersion;
  let targetVersion;

  const test = fields.history_window_start.current_version;

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
      currentVersion = fields[fieldName].current_version;
      targetVersion = fields[fieldName].target_version;
      break;
    case 'version':
    case 'max_signals':
    case 'anomaly_threshold':
      currentVersion = fields[fieldName].current_version.toString();
      targetVersion = fields[fieldName].target_version.toString();
      break;
    case 'tags':
      currentVersion = sortAndStringifyJson(fields[fieldName].current_version);
      targetVersion = sortAndStringifyJson(fields[fieldName].target_version);
      break;
    case 'eql_query':
      currentVersion = fields[fieldName].current_version.query;
      targetVersion = fields[fieldName].target_version.query;
      break;
    //   case 'data_source':
    //     if(fields[fieldName].current_version?.type === DataSourceType.index_patterns){
    //         currentVersion = fields[fieldName].current_version.;

    //     }
    //     targetVersion = fields[fieldName].target_version;
    default:
      currentVersion = sortAndStringifyJson(fields[fieldName].current_version);
      targetVersion = sortAndStringifyJson(fields[fieldName].target_version);
  }
  return [currentVersion, targetVersion];
};
