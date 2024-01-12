/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TimeRange } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { CustomThresholdExpressionMetric } from './types';

export interface GetViewInAppUrlArgs {
  dataViewId?: string;
  endedAt?: string;
  startedAt?: string;
  filter?: string;
  logExplorerLocator?: LocatorPublic<DiscoverAppLocatorParams>;
  metrics?: CustomThresholdExpressionMetric[];
}

export const getViewInAppUrl = ({
  dataViewId,
  endedAt,
  startedAt = new Date().toISOString(),
  filter,
  logExplorerLocator,
  metrics = [],
}: GetViewInAppUrlArgs) => {
  if (!logExplorerLocator) return '';

  const timeRange: TimeRange | undefined = getPaddedAlertTimeRange(startedAt, endedAt);
  timeRange.to = endedAt ? timeRange.to : 'now';

  const query = {
    query: '',
    language: 'kuery',
  };
  const isOneCountConditionWithFilter =
    metrics.length === 1 && metrics[0].aggType === 'count' && metrics[0].filter;
  if (filter && isOneCountConditionWithFilter) {
    query.query = `${filter} and ${metrics[0].filter}`;
  } else if (isOneCountConditionWithFilter) {
    query.query = metrics[0].filter!;
  } else if (filter) {
    query.query = filter;
  }

  return logExplorerLocator?.getRedirectUrl({
    dataset: dataViewId,
    timeRange,
    query,
  });
};
