/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreSetup } from 'src/core/server';
import { initDeleteSpacesApi } from './delete';
import { initGetSpaceApi } from './get';
import { initGetAllSpacesApi } from './get_all';
import { initPostSpacesApi } from './post';
import { initPutSpacesApi } from './put';
import { SpacesServiceStart } from '../../../spaces_service';
import { UsageStatsServiceSetup } from '../../../usage_stats';
import { initCopyToSpacesApi } from './copy_to_space';
import { initShareToSpacesApi } from './share_to_space';
import type { SpacesRouter } from '../../../types';

export interface ExternalRouteDeps {
  externalRouter: SpacesRouter;
  getStartServices: CoreSetup['getStartServices'];
  getSpacesService: () => SpacesServiceStart;
  usageStatsServicePromise: Promise<UsageStatsServiceSetup>;
  log: Logger;
}

export function initExternalSpacesApi(deps: ExternalRouteDeps) {
  initDeleteSpacesApi(deps);
  initGetSpaceApi(deps);
  initGetAllSpacesApi(deps);
  initPostSpacesApi(deps);
  initPutSpacesApi(deps);
  initCopyToSpacesApi(deps);
  initShareToSpacesApi(deps);
}
