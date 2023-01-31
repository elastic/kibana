/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleNotifyWhen } from '@kbn/alerting-plugin/common';

export const DEFAULT_FREQUENCY_WITH_SUMMARY = {
  notifyWhen: RuleNotifyWhen.ACTIVE,
  throttle: null,
  summary: true,
};

export const DEFAULT_FREQUENCY_WITHOUT_SUMMARY = {
  notifyWhen: RuleNotifyWhen.CHANGE,
  throttle: null,
  summary: false,
};
