/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';
// @ts-ignore
import { addSystemApiHeader } from 'ui/system_api';

const API_BASE_URL = '/api/reporting/jobs';

class JobQueueClient {
  public list = (page = 0) => {
    return kfetch({
      method: 'POST',
      pathname: `${API_BASE_URL}/list`,
      query: { page },
      headers: addSystemApiHeader({}),
    });
  };
}

export const jobQueueClient = new JobQueueClient();
