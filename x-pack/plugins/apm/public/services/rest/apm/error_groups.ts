/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelizeKeys } from 'humps';
import { IUrlParams } from '../../../store/urlParams';
import { callApi } from '../callApi';
import { getEncodedEsQuery } from './apm';

interface ErrorGroupListParams extends IUrlParams {
  size: number;
  sortField: string;
  sortDirection: string;
}

export async function loadErrorGroupList({
  serviceName,
  start,
  end,
  kuery,
  size,
  sortField,
  sortDirection
}: ErrorGroupListParams) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/errors`,
    query: {
      start,
      end,
      size,
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
  // TODO: add types when error section is converted to ts
  const res = await callApi<any>(
    {
      pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}`,
      query: {
        start,
        end,
        esFilterQuery: await getEncodedEsQuery(kuery)
      }
    },
    {
      camelcase: false
    }
  );
  const camelizedRes: any = camelizeKeys(res);
  if (res.error.context) {
    camelizedRes.error.context = res.error.context;
  }
  return camelizedRes;
}

export async function loadErrorDistribution({
  serviceName,
  start,
  end,
  kuery,
  errorGroupId
}: IUrlParams) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}/distribution`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
