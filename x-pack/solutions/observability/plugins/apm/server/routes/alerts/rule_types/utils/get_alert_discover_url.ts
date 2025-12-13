/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { from } from '@kbn/esql-composer';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_TYPE,
  TRANSACTION_NAME,
  ERROR_GROUP_ID,
} from '../../../../../common/es_fields/apm';
import {
  filterByServiceName,
  filterByTransactionType,
  filterByTransactionNameOrSpanName,
  filterByErrorGroupId,
  filterByEnvironment,
} from '../../../../../common/utils/esql/filters';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';

export interface GetAlertDiscoverUrlParams {
  discoverLocator?: LocatorPublic<DiscoverAppLocatorParams>;
  index: string;
  groupByFields: Record<string, string>;
  dateStart: string;
  dateEnd: string;
  spaceId?: string;
}

/**
 * Generates a Discover URL for APM alert data using the Discover locator.
 * Builds an ESQL query based on groupByFields using the ESQL composer.
 */
export function getAlertDiscoverUrl({
  discoverLocator,
  index,
  groupByFields,
  dateStart,
  dateEnd,
  spaceId,
}: GetAlertDiscoverUrlParams): string | undefined {
  if (!discoverLocator) {
    return undefined;
  }

  const filters = [];

  if (groupByFields[SERVICE_NAME]) {
    filters.push(filterByServiceName(groupByFields[SERVICE_NAME]));
  }

  if (
    groupByFields[SERVICE_ENVIRONMENT] &&
    groupByFields[SERVICE_ENVIRONMENT] !== ENVIRONMENT_ALL_VALUE &&
    groupByFields[SERVICE_ENVIRONMENT] !== ENVIRONMENT_NOT_DEFINED_VALUE
  ) {
    filters.push(filterByEnvironment(groupByFields[SERVICE_ENVIRONMENT]));
  }

  if (groupByFields[TRANSACTION_TYPE]) {
    filters.push(filterByTransactionType(groupByFields[TRANSACTION_TYPE]));
  }

  if (groupByFields[TRANSACTION_NAME]) {
    filters.push(filterByTransactionNameOrSpanName(groupByFields[TRANSACTION_NAME], undefined));
  }

  if (groupByFields[ERROR_GROUP_ID]) {
    filters.push(filterByErrorGroupId(groupByFields[ERROR_GROUP_ID]));
  }

  const esqlQuery =
    filters.length === 0
      ? from(index).toString()
      : from(index)
          .pipe(...filters)
          .toString();

  const discoverParams: DiscoverAppLocatorParams = {
    timeRange: {
      from: dateStart,
      to: dateEnd,
    },
    query: {
      esql: esqlQuery,
    },
    useHash: true,
  };

  return discoverLocator.getRedirectUrl(discoverParams, { spaceId });
}
