/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiDefinitionRoute } from './api_scraper/create';
import { deleteApiDefinitionRoute } from './api_scraper/delete';
import { previewApiDefinitionRoute } from './api_scraper/preview';
import { disableStreamEntitiesRoute } from './enablement/disable';
import { enableStreamEntitiesRoute } from './enablement/enable';
import { forkStreamEntitiesRoute } from './stream_entities/fork';
import { readStreamEntitiesRoute } from './stream_entities/read';

export const StreamEntitiesManagerRouteRepository = {
  ...createApiDefinitionRoute,
  ...deleteApiDefinitionRoute,
  ...previewApiDefinitionRoute,
  ...enableStreamEntitiesRoute,
  ...disableStreamEntitiesRoute,
  ...forkStreamEntitiesRoute,
  ...readStreamEntitiesRoute,
};

export type StreamEntitiesManagerRouteRepository = typeof StreamEntitiesManagerRouteRepository;
