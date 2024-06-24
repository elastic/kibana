/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsExplorerLocatorParams } from '@kbn/deeplinks-observability';
import type { TimeRange } from '@kbn/es-query';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import { getGroupFilters } from './helpers/get_group';
import { SearchConfigurationWithExtractedReferenceType } from './types';
import type { CustomThresholdExpressionMetric } from './types';
import { Group } from '../typings';

export interface GetViewInAppUrlArgs {
  searchConfiguration?: SearchConfigurationWithExtractedReferenceType;
  dataViewId?: string;
  endedAt?: string;
  groups?: Group[];
  logsExplorerLocator?: LocatorPublic<LogsExplorerLocatorParams>;
  metrics?: CustomThresholdExpressionMetric[];
  startedAt?: string;
}

export const getViewInAppUrl = ({
  dataViewId,
  endedAt,
  groups,
  logsExplorerLocator,
  metrics = [],
  searchConfiguration,
  startedAt = new Date().toISOString(),
}: GetViewInAppUrlArgs) => {
  if (!logsExplorerLocator) return '';

  const dataset = searchConfiguration?.index.title ?? dataViewId;
  const searchConfigurationQuery = searchConfiguration?.query.query;
  const searchConfigurationFilters = searchConfiguration?.filter || [];
  const groupFilters = getGroupFilters(groups);
  const timeRange: TimeRange | undefined = getPaddedAlertTimeRange(startedAt, endedAt);
  timeRange.to = endedAt ? timeRange.to : 'now';

  const query = {
    query: '',
    language: 'kuery',
  };
  const isOneCountConditionWithFilter =
    metrics.length === 1 && metrics[0].aggType === 'count' && metrics[0].filter;
  if (searchConfigurationQuery && isOneCountConditionWithFilter) {
    query.query = `${searchConfigurationQuery} and ${metrics[0].filter}`;
  } else if (isOneCountConditionWithFilter) {
    query.query = metrics[0].filter!;
  } else if (searchConfigurationQuery) {
    query.query = searchConfigurationQuery;
  }

  return logsExplorerLocator?.getRedirectUrl({
    dataset,
    timeRange,
    query,
    filters: [...searchConfigurationFilters, ...groupFilters],
  });
};
