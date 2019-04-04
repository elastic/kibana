/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceAPIResponse } from 'x-pack/plugins/apm/server/lib/services/get_service';
import { ServiceListAPIResponse } from 'x-pack/plugins/apm/server/lib/services/get_services';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadServiceList({ start, end, kuery }: IUrlParams) {
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
  return callApi<ServiceAPIResponse>({
    pathname: `/api/apm/services/${serviceName}`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
