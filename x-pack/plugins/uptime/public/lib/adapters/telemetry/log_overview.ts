/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

export const createLogOverviewPageView = (xsrf: string) => async () => {
  await axios.post('/api/uptime/logOverview', undefined, { headers: { 'kbn-xsrf': xsrf } });
};
