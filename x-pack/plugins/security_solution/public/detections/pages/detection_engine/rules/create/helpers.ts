/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepmerge from 'deepmerge';
import { NewRule } from '../../../../containers/detection_engine/rules';
import {
  formatDefineStepData,
  formatAboutStepData,
  formatScheduleStepData,
  formatActionsStepData,
} from '../utils';

import { AboutStepRule, DefineStepRule, ScheduleStepRule, ActionsStepRule } from '../types';

export const formatRule = (
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule,
  actionsData: ActionsStepRule
): NewRule =>
  deepmerge.all([
    formatDefineStepData(defineStepData),
    formatAboutStepData(aboutStepData),
    formatScheduleStepData(scheduleData),
    formatActionsStepData(actionsData),
  ]) as NewRule;
