/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ErrorDistributionAPIResponse } from '../../../../server/lib/errors/distribution/get_distribution';
import { ErrorGroupAPIResponse } from '../../../../server/lib/errors/get_error_group';
import { ErrorGroupListAPIResponse } from '../../../../server/lib/errors/get_error_groups';
import { MissingArgumentsError } from '../../../hooks/useFetcher';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadErrorGroupList({
  serviceName,
  start,
  end,
  kuery,
  sortField,
  sortDirection
}: IUrlParams) {
  if (!(serviceName && start && end)) {
    throw new MissingArgumentsError();
  }
  return callApi<ErrorGroupListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/errors`,
    query: {
      start,
      end,
      sortField,
      sortDirection,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadErrorGroupDetails({
  serviceName,
  start,
  end,
  kuery,
  errorGroupId
}: IUrlParams) {
  if (!(serviceName && start && end && errorGroupId)) {
    throw new MissingArgumentsError();
  }
  return callApi<ErrorGroupAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadErrorDistribution({
  serviceName,
  start,
  end,
  kuery,
  errorGroupId
}: IUrlParams) {
  if (!(serviceName && start && end)) {
    throw new MissingArgumentsError();
  }

  const pathname = errorGroupId
    ? `/api/apm/services/${serviceName}/errors/${errorGroupId}/distribution`
    : `/api/apm/services/${serviceName}/errors/distribution`;

  return callApi<ErrorDistributionAPIResponse>({
    pathname,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
