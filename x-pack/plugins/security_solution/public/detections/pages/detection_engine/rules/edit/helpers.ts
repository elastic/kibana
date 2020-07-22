/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepmerge from 'deepmerge';
import { Severity } from '../../../../../../common/detection_engine/schemas/common/schemas';
import { PatchRule } from '../../../../containers/detection_engine/rules';
import {
  formatDefineStepData,
  formatAboutStepData,
  formatScheduleStepData,
  formatActionsStepData,
} from '../utils';
import {
  AboutStepRule,
  AboutStepRuleJson,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
} from '../types';

export const formatForPatch = (data: AboutStepRuleJson): PatchRule => {
  return {
    ...data,
    building_block_type: data.building_block_type ?? null,
    exceptions_list: data.exceptions_list ?? [],
    note: data.note ?? '',
    severity: data.severity as Severity, // TODO: type
  };
};

export const formatRule = (
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule,
  actionsData: ActionsStepRule
): PatchRule =>
  deepmerge.all([
    formatDefineStepData(defineStepData),
    formatForPatch(formatAboutStepData(aboutStepData)),
    formatScheduleStepData(scheduleData),
    formatActionsStepData(actionsData),
  ]);
