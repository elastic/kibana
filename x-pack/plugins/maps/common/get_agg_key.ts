/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AGG_DELIMITER, AGG_TYPE, COUNT_PROP_NAME, JOIN_FIELD_NAME_PREFIX } from './constants';

export function getJoinAggKey({
  aggType,
  aggFieldName,
  rightSourceId,
}: {
  aggType: AGG_TYPE;
  aggFieldName?: string;
  rightSourceId: string;
}): string {
  const metricKey =
    aggType !== AGG_TYPE.COUNT ? `${aggType}${AGG_DELIMITER}${aggFieldName}` : aggType;
  return `${JOIN_FIELD_NAME_PREFIX}${metricKey}__${rightSourceId}`;
}

export function getSourceAggKey({
  aggType,
  aggFieldName,
}: {
  aggType: AGG_TYPE;
  aggFieldName?: string;
}): string {
  return aggType !== AGG_TYPE.COUNT ? `${aggType}${AGG_DELIMITER}${aggFieldName}` : COUNT_PROP_NAME;
}
