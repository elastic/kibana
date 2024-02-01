/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFieldsDiff } from '../../../../../common/api/detection_engine';
import type { FormattedFieldDiff } from '../../model/rule_details/rule_field_diff';

export const getFormattedFieldDiff = (
  fieldName: keyof RuleFieldsDiff,
  fields: Partial<RuleFieldsDiff>
): FormattedFieldDiff[] => {
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
    case 'kql_query':
    case 'threshold':
    case 'threat_query':
    case 'esql_query':
      // TODO: This doesn't work if current version has a different number of fields or different fields than target version
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
          currentVersion: fields[fieldName].current_version ?? '',
          targetVersion: fields[fieldName].target_version ?? '',
        },
      ];
  }
};
