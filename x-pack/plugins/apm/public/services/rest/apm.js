/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelizeKeys } from 'humps';
import { convertKueryToEsQuery } from '../kuery';
import { callApi } from './callApi';
import { getAPMIndexPattern } from './savedObjects';

export async function loadLicense() {
  return callApi({
    pathname: `/api/xpack/v1/info`
  });
}

export async function loadServerStatus() {
  return callApi({
    pathname: `/api/apm/status/server`
  });
}

export async function loadAgentStatus() {
  return callApi({
    pathname: `/api/apm/status/agent`
  });
}

export async function getEncodedEsQuery(kuery) {
  if (!kuery) {
    return;
  }

  const indexPattern = await getAPMIndexPattern();

  if (!indexPattern) {
    return;
  }

  const esFilterQuery = convertKueryToEsQuery(kuery, indexPattern);
  return encodeURIComponent(JSON.stringify(esFilterQuery));
}

export async function loadServiceList({ start, end, kuery }) {
  return callApi({
    pathname: `/api/apm/services`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadServiceDetails({ serviceName, start, end, kuery }) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadTransactionList({
  serviceName,
  start,
  end,
  kuery,
  transactionType
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery),
      transaction_type: transactionType
    }
  });
}

export async function loadTransactionDistribution({
  serviceName,
  start,
  end,
  transactionName,
  kuery
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions/distribution`,
    query: {
      start,
      end,
      transaction_name: transactionName,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}

export async function loadSpans({ serviceName, start, end, transactionId }) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}/spans`,
    query: {
      start,
      end
    }
  });
}

export async function loadTransaction({
  serviceName,
  start,
  end,
  transactionId,
  kuery
}) {
  const res = await callApi(
    {
      pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}`,
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
  const camelizedRes = camelizeKeys(res);
  if (res.context) {
    camelizedRes.context = res.context;
  }
  return camelizedRes;
}

export async function loadCharts({
  serviceName,
  start,
  end,
  kuery,
  transactionType,
  transactionName
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions/charts`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery),
      transaction_type: transactionType,
      transaction_name: transactionName
    }
  });
}

export async function loadErrorGroupList({
  serviceName,
  start,
  end,
  kuery,
  size,
  sortField,
  sortDirection
}) {
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
}) {
  const res = await callApi(
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
  const camelizedRes = camelizeKeys(res);
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
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}/distribution`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
    }
  });
}
