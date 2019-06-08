/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EnvironmentUIFilterAPIResponse } from '../../../../server/lib/ui_filters/get_environments';
import { callApi } from '../callApi';

export async function loadEnvironmentsFilter({
  serviceName,
  start,
  end
}: {
  serviceName?: string;
  start: string;
  end: string;
}) {
  return callApi<EnvironmentUIFilterAPIResponse>({
    pathname: '/api/apm/ui_filters/environments',
    query: {
      start,
      end,
      serviceName
    }
  });
}
