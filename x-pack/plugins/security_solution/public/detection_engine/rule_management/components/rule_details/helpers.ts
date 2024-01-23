/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleFieldDiff } from '../../model/rule_details/rule_field_diff';
import {
  ABOUT_UPGRADE_FIELD_ORDER,
  DEFINITION_UPGRADE_FIELD_ORDER,
  OTHER_UPGRADE_FIELD_ORDER,
  SCHEDULE_UPGRADE_FIELD_ORDER,
  SETUP_UPGRADE_FIELD_ORDER,
} from './constants';

export const getSectionedFieldDiffs = (fields: RuleFieldDiff[]) => {
  const aboutFields = [];
  const definitionFields = [];
  const scheduleFields = [];
  const setupFields = [];
  const otherFields = [];
  for (const field of fields) {
    if (ABOUT_UPGRADE_FIELD_ORDER.includes(field.fieldName)) {
      aboutFields.push(field);
    } else if (DEFINITION_UPGRADE_FIELD_ORDER.includes(field.fieldName)) {
      definitionFields.push(field);
    } else if (SCHEDULE_UPGRADE_FIELD_ORDER.includes(field.fieldName)) {
      scheduleFields.push(field);
    } else if (SETUP_UPGRADE_FIELD_ORDER.includes(field.fieldName)) {
      setupFields.push(field);
    } else if (OTHER_UPGRADE_FIELD_ORDER.includes(field.fieldName)) {
      otherFields.push(field);
    }
  }
  return {
    aboutFields,
    definitionFields,
    scheduleFields,
    setupFields,
    otherFields,
  };
};
