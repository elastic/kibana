/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateRandomStringName } from './integrations';
import { request } from './common';
import { apiPaths } from './navigation';

export const savedQueryFixture = {
  id: generateRandomStringName(1)[0],
  description: 'Test saved query description',
  ecs_mapping: { labels: { field: 'hours' } },
  interval: '3600',
  query: 'select * from uptime;',
  platform: 'linux,darwin',
};

export const loadSavedQuery = () =>
  request<{ data: { id: string } }>({
    method: 'POST',
    body: savedQueryFixture,
    url: apiPaths.osquery.savedQueries,
  }).then((response) => response.body.data.id);

export const cleanupSavedQuery = (id: string) => {
  request({ method: 'DELETE', url: apiPaths.osquery.savedQuery(id) });
};
