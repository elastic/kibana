/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AllFieldsDiff } from '../../../../../common/api/detection_engine';

export const getFormattedFieldDiff = (
  fieldName: keyof AllFieldsDiff,
  fields: AllFieldsDiff
): Array<{ currentVersion: unknown; targetVersion: unknown; fieldName: string }> => {
  switch (fieldName) {
    case 'data_source':
      const dataSourceObj = fields[fieldName];
      return [
        {
          fieldName: 'type',
          currentVersion: fields[fieldName].current_version?.type,
          targetVersion: fields[fieldName].target_version?.type,
        },
        {
          fieldName: 'index_patterns',
          currentVersion:
            dataSourceObj.current_version?.type === 'index_patterns'
              ? dataSourceObj.current_version?.index_patterns
              : '',
          targetVersion:
            dataSourceObj.target_version?.type === 'index_patterns'
              ? dataSourceObj.target_version?.index_patterns
              : '',
        },
        {
          fieldName: 'data_view_id',
          currentVersion:
            dataSourceObj.current_version?.type === 'data_view'
              ? dataSourceObj.current_version?.data_view_id
              : '',
          targetVersion:
            dataSourceObj.target_version?.type === 'data_view'
              ? dataSourceObj.target_version?.data_view_id
              : '',
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
          currentVersion: fields[fieldName].current_version.filters,
          targetVersion: fields[fieldName].target_version.filters,
        },
        {
          fieldName: 'language',
          currentVersion: fields[fieldName].current_version.language,
          targetVersion: fields[fieldName].target_version.language,
        },
      ];
    case 'kql_query':
      return [
        {
          fieldName: 'query',
          currentVersion: fields[fieldName].current_version.query,
          targetVersion: fields[fieldName].target_version.query,
        },
        {
          fieldName: 'filters',
          currentVersion: fields[fieldName].current_version.filters,
          targetVersion: fields[fieldName].target_version.filters,
        },
        {
          fieldName: 'language',
          currentVersion: fields[fieldName].current_version.language,
          targetVersion: fields[fieldName].target_version.language,
        },
        {
          fieldName: 'type',
          currentVersion: fields[fieldName].current_version.type,
          targetVersion: fields[fieldName].target_version.type,
        },
      ];
    case 'threshold':
    case 'threat_query':
    case 'esql_query':
      const currentVersionSubfields = Object.keys(fields[fieldName].current_version);
      const subfieldsToReturn = [];
      for (let i = 0; i < currentVersionSubfields.length; i++) {
        const subfieldName = currentVersionSubfields[i];
        subfieldsToReturn.push({
          fieldName: subfieldName,
          currentVersion: fields[fieldName].current_version[subfieldName],
          targetVersion: fields[fieldName].target_version[subfieldName],
        });
      }
      return subfieldsToReturn;
    default:
      return [
        {
          fieldName,
          currentVersion: fields[fieldName].current_version,
          targetVersion: fields[fieldName].target_version,
        },
      ];
  }
};
