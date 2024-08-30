/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFieldsDiff, ThreeWayDiff } from '../../../../../common/api/detection_engine';
import { ThreeWayDiffOutcome } from '../../../../../common/api/detection_engine';
import type { FieldsGroupDiff } from '../../model/rule_details/rule_field_diff';
import {
  ABOUT_UPGRADE_FIELD_ORDER,
  DEFINITION_UPGRADE_FIELD_ORDER,
  SCHEDULE_UPGRADE_FIELD_ORDER,
  SETUP_UPGRADE_FIELD_ORDER,
} from './constants';

export const getSectionedFieldDiffs = (fields: FieldsGroupDiff[]) => {
  const aboutFields = [];
  const definitionFields = [];
  const scheduleFields = [];
  const setupFields = [];
  for (const field of fields) {
    if (ABOUT_UPGRADE_FIELD_ORDER.includes(field.fieldsGroupName)) {
      aboutFields.push(field);
    } else if (DEFINITION_UPGRADE_FIELD_ORDER.includes(field.fieldsGroupName)) {
      definitionFields.push(field);
    } else if (SCHEDULE_UPGRADE_FIELD_ORDER.includes(field.fieldsGroupName)) {
      scheduleFields.push(field);
    } else if (SETUP_UPGRADE_FIELD_ORDER.includes(field.fieldsGroupName)) {
      setupFields.push(field);
    }
  }
  return {
    aboutFields,
    definitionFields,
    scheduleFields,
    setupFields,
  };
};

/**
 * Filters out any fields that have a `diff_outcome` of `CustomizedValueNoUpdate`
 * or `CustomizedValueSameUpdate` as they are not supported for display in the
 * current per-field rule diff flyout
 */
export const filterUnsupportedDiffOutcomes = (
  fields: Partial<RuleFieldsDiff>
): Partial<RuleFieldsDiff> =>
  Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => {
      const diff = value as ThreeWayDiff<unknown>;
      return (
        diff.diff_outcome !== ThreeWayDiffOutcome.CustomizedValueNoUpdate &&
        diff.diff_outcome !== ThreeWayDiffOutcome.CustomizedValueSameUpdate &&
        diff.diff_outcome !== ThreeWayDiffOutcome.MissingBaseNoUpdate
      );
    })
  );
