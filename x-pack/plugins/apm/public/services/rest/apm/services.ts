/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceAPIResponse } from '../../../../server/lib/services/get_service';
import { ServiceListAPIResponse } from '../../../../server/lib/services/get_services';
import { MissingArgumentsError } from '../../../hooks/useFetcher';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadServiceList({ start, end, kuery }: IUrlParams) {
  if (!(start && end)) {
    throw new MissingArgumentsError();
  }

  return callApi<ServiceListAPIResponse>({
    pathname: `/api/apm/services`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadServiceDetails({
  serviceName,
  start,
  end,
  kuery
}: IUrlParams) {
  if (!(serviceName && start && end)) {
    throw new MissingArgumentsError();
  }

  return callApi<ServiceAPIResponse>({
    pathname: `/api/apm/services/${serviceName}`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
