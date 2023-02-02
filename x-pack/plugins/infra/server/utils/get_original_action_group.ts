/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTION_GROUP } from '@kbn/rule-data-utils';

export const getOriginalActionGroup = (
  alertHits: Array<{ [id: string]: any }> | null | undefined
) => {
  const source = alertHits && alertHits.length > 0 ? alertHits[0]._source : undefined;
  return source?.[ALERT_ACTION_GROUP];
};
