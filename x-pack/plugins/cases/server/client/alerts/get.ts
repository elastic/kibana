/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MgetResponseItem, GetGetResult } from '@elastic/elasticsearch/lib/api/types';
import { CasesClientGetAlertsResponse } from './types';
import { CasesClientArgs } from '..';
import { AlertInfo } from '../../common/types';
import { Alert } from '../../services/alerts';

function isAlert(
  doc?: MgetResponseItem<unknown>
): doc is Omit<GetGetResult<Alert>, '_source'> & { _source: Alert } {
  return Boolean(doc && !('error' in doc) && '_source' in doc);
}

export const getAlerts = async (
  alertsInfo: AlertInfo[],
  clientArgs: CasesClientArgs
): Promise<CasesClientGetAlertsResponse> => {
  const { alertsService } = clientArgs;
  if (alertsInfo.length === 0) {
    return [];
  }

  const alerts = await alertsService.getAlerts(alertsInfo);
  if (!alerts) {
    return [];
  }

  return alerts.docs.filter(isAlert).map((alert) => ({
    id: alert._id,
    index: alert._index,
    ...alert._source,
  }));
};
