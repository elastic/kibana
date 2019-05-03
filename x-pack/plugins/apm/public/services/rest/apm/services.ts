/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceAPIResponse } from '../../../../server/lib/services/get_service';
import { ServiceListAPIResponse } from '../../../../server/lib/services/get_services';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

export async function loadServiceList({
  start,
  end,
  kuery
}: {
  start: string;
  end: string;
  kuery: string | undefined;
}) {
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
}: {
  serviceName: string;
  start: string;
  end: string;
  kuery: string | undefined;
}) {
  return callApi<ServiceAPIResponse>({
    pathname: `/api/apm/services/${serviceName}`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
