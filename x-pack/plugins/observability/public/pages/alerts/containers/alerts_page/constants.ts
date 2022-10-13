/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import { ALERT_STATUS } from '@kbn/rule-data-utils';

export const ALERTS_PAGE_ID = 'alerts-o11y';
export const ALERTS_PER_PAGE = 50;
export const ALERTS_TABLE_ID = 'xpack.observability.alerts.alert.table';

const regExpEscape = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
export const NO_INDEX_PATTERNS: DataViewBase[] = [];
export const BASE_ALERT_REGEX = new RegExp(
  `\\s*${regExpEscape(ALERT_STATUS)}\\s*:\\s*"(.*?|\\*?)"`
);
export const ALERT_STATUS_REGEX = new RegExp(
  `\\s*and\\s*${regExpEscape(ALERT_STATUS)}\\s*:\\s*(".+?"|\\*?)|${regExpEscape(
    ALERT_STATUS
  )}\\s*:\\s*(".+?"|\\*?)`,
  'gm'
);
