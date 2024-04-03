/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/alerting-plugin/common';
import { TopAlert } from '../../..';
import { CustomThresholdAlertFields, CustomThresholdRuleTypeParams } from '../types';

// TODO Use a generic props for app sections https://github.com/elastic/kibana/issues/152690
export type CustomThresholdRule = Rule<CustomThresholdRuleTypeParams>;
export type CustomThresholdAlert = TopAlert<CustomThresholdAlertFields>;
