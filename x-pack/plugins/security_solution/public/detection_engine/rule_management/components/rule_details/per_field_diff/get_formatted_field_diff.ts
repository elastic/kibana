/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AllFieldsDiff,
  RuleFieldsDiff,
  RuleFieldsDiffWithDataSource,
  RuleFieldsDiffWithKqlQuery,
  RuleFieldsDiffWithEqlQuery,
} from '../../../../../../common/api/detection_engine';
import type { FormattedFieldDiff } from '../../../model/rule_details/rule_field_diff';
import {
  getFieldDiffsForDataSource,
  getFieldDiffsForKqlQuery,
  getFieldDiffsForEqlQuery,
  getFieldDiffsForRuleSchedule,
  getFieldDiffsForRuleNameOverride,
  getFieldDiffsForTimestampOverride,
  getFieldDiffsForTimelineTemplate,
  getFieldDiffsForBuildingBlock,
  sortAndStringifyJson,
} from './get_field_diffs_for_grouped_fields';

export const getFormattedFieldDiffGroups = (
  fieldName: keyof AllFieldsDiff,
  fields: Partial<RuleFieldsDiff>
): FormattedFieldDiff => {
  switch (fieldName) {
    case 'data_source':
      const dataSourceThreeWayDiff = (fields as RuleFieldsDiffWithDataSource)[fieldName];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForDataSource(dataSourceThreeWayDiff),
      };
    case 'kql_query':
      const kqlQueryThreeWayDiff = (fields as RuleFieldsDiffWithKqlQuery)[fieldName];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForKqlQuery(kqlQueryThreeWayDiff),
      };
    case 'eql_query':
      const eqlQueryThreeWayDiff = (fields as RuleFieldsDiffWithEqlQuery)[fieldName];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForEqlQuery(eqlQueryThreeWayDiff),
      };
    case 'rule_schedule':
      const ruleScheduleThreeWayDiff = fields[fieldName] as AllFieldsDiff['rule_schedule'];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForRuleSchedule(ruleScheduleThreeWayDiff),
      };
    case 'rule_name_override':
      const ruleNameOverrideThreeWayDiff = fields[fieldName] as AllFieldsDiff['rule_name_override'];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForRuleNameOverride(ruleNameOverrideThreeWayDiff),
      };
    case 'timestamp_override':
      const timestampOverrideThreeWayDiff = fields[
        fieldName
      ] as AllFieldsDiff['timestamp_override'];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForTimestampOverride(timestampOverrideThreeWayDiff),
      };
    case 'timeline_template':
      const timelineTemplateThreeWayDiff = fields[fieldName] as AllFieldsDiff['timeline_template'];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForTimelineTemplate(timelineTemplateThreeWayDiff),
      };
    case 'building_block':
      const buildingBlockThreeWayDiff = fields[fieldName] as AllFieldsDiff['building_block'];
      return {
        shouldShowSubtitles: true,
        fieldDiffs: getFieldDiffsForBuildingBlock(buildingBlockThreeWayDiff),
      };
    default:
      const fieldThreeWayDiff = (fields as AllFieldsDiff)[fieldName];
      const currentVersionField = sortAndStringifyJson(fieldThreeWayDiff.current_version);
      const targetVersionField = sortAndStringifyJson(fieldThreeWayDiff.target_version);
      return {
        shouldShowSubtitles: false,
        fieldDiffs:
          currentVersionField !== targetVersionField
            ? [
                {
                  fieldName,
                  currentVersion: currentVersionField,
                  targetVersion: targetVersionField,
                },
              ]
            : [],
      };
  }
};
