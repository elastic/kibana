/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Alert } from '@kbn/alerts-as-data-utils';
import { ALERT_ACTION_GROUP } from '@kbn/rule-data-utils';
import { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import { ParsedExperimentalFields } from '@kbn/rule-registry-plugin/common/parse_experimental_fields';

export const getOriginalActionGroup = <
  T extends Alert | (ParsedTechnicalFields & ParsedExperimentalFields)
>(
  alertHitSource: Partial<T> | undefined | null
) => {
  return alertHitSource?.[ALERT_ACTION_GROUP];
};
