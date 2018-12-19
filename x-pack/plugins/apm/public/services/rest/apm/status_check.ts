/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApi } from '../callApi';

export async function loadServerStatus() {
  return callApi({
    pathname: `/api/apm/status/server`
  });
}

export async function loadAgentStatus() {
  return callApi<{ dataFound: boolean }>({
    pathname: `/api/apm/status/agent`
  });
}
