/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'isomorphic-fetch';
import { camelizeKeys } from 'humps';
import { kfetch } from 'ui/kfetch';
import { memoize, isEmpty, first, startsWith } from 'lodash';
import chrome from 'ui/chrome';
import { convertKueryToEsQuery } from './kuery';
import { getFromSavedObject } from 'ui/index_patterns/static_utils';

function fetchOptionsWithDebug(fetchOptions) {
  const debugEnabled =
    sessionStorage.getItem('apm_debug') === 'true' &&
    startsWith(fetchOptions.pathname, '/api/apm');

  if (!debugEnabled) {
    return fetchOptions;
  }

  return {
    ...fetchOptions,
    query: {
      ...fetchOptions.query,
      _debug: true
    }
  };
}

export async function callApi(fetchOptions, kibanaOptions) {
  const combinedKibanaOptions = {
    camelcase: true,
    ...kibanaOptions
  };

  const combinedFetchOptions = fetchOptionsWithDebug(fetchOptions);
  const res = await kfetch(combinedFetchOptions, combinedKibanaOptions);
  return combinedKibanaOptions.camelcase ? camelizeKeys(res) : res;
}

export const getAPMIndexPattern = memoize(async () => {
  const res = await callApi({
    pathname: chrome.addBasePath(`/api/saved_objects/_find`),
    query: {
      type: 'index-pattern'
    }
  });

  if (isEmpty(res.savedObjects)) {
    return {};
  }

  const apmIndexPattern = chrome.getInjected('apmIndexPattern');
  const apmSavedObject = first(
    res.savedObjects.filter(
      savedObject => savedObject.attributes.title === apmIndexPattern
    )
  );

  return getFromSavedObject(apmSavedObject);
});

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

export async function loadSpans({
  serviceName,
  start,
  end,
  transactionId,
  kuery
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}/spans`,
    query: {
      start,
      end,
      esFilterQuery: await getEncodedEsQuery(kuery)
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
  q,
  sortBy,
  sortOrder
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/errors`,
    query: {
      start,
      end,
      size,
      q,
      sortBy,
      sortOrder,
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

export async function createWatch(id, watch) {
  return callApi({
    method: 'PUT',
    pathname: `/api/watcher/watch/${id}`,
    body: JSON.stringify({ type: 'json', id, watch })
  });
}
