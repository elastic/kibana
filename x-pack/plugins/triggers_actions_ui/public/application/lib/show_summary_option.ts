/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAction } from '@kbn/alerting-plugin/common';

export const showSummaryOption = (actionItem: RuleAction) =>
  actionItem.actionTypeId === '.email' &&
  (actionItem.group === 'metrics.threshold.fired' ||
    actionItem.group === 'metrics.threshold.warning' ||
    actionItem.group === 'metrics.threshold.nodata');
