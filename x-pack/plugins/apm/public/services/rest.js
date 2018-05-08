/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'isomorphic-fetch';
import { camelizeKeys } from 'humps';
import { kfetch } from 'ui/kfetch';
import { omit } from 'lodash';

function removeEmpty(query) {
  return omit(query, val => val == null);
}

async function callApi(options) {
  const { camelcase, compact, ...requestOptions } = {
    compact: true, // remove empty query args
    camelcase: true,
    ...options
  };

  const res = await kfetch({
    ...requestOptions,
    query: compact ? removeEmpty(options.query) : options.query
  });

  return camelcase ? camelizeKeys(res) : res;
}

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

export async function loadServiceList({ start, end }) {
  return callApi({
    pathname: `/api/apm/services`,
    query: {
      start,
      end
    }
  });
}

export async function loadServiceDetails({ start, end, serviceName }) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}`,
    query: {
      start,
      end
    }
  });
}

export async function loadTransactionList({
  serviceName,
  start,
  end,
  transactionType
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions`,
    query: {
      start,
      end,
      transaction_type: transactionType
    }
  });
}

export async function loadTransactionDistribution({
  serviceName,
  start,
  end,
  transactionName
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions/distribution`,
    query: {
      start,
      end,
      transaction_name: transactionName
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
  transactionId
}) {
  const res = await callApi({
    pathname: `/api/apm/services/${serviceName}/transactions/${transactionId}`,
    camelcase: false,
    query: {
      start,
      end
    }
  });
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
  transactionType,
  transactionName
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/transactions/charts`,
    query: {
      start,
      end,
      transaction_type: transactionType,
      transaction_name: transactionName
    }
  });
}

export async function loadErrorGroupList({
  serviceName,
  start,
  end,
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
      sortOrder
    }
  });
}

export async function loadErrorGroupDetails({
  serviceName,
  errorGroupId,
  start,
  end
}) {
  const res = await callApi({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}`,
    camelcase: false,
    query: {
      start,
      end
    }
  });
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
  errorGroupId
}) {
  return callApi({
    pathname: `/api/apm/services/${serviceName}/errors/${errorGroupId}/distribution`,
    query: {
      start,
      end
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
