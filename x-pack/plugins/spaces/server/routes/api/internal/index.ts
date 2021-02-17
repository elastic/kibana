/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesRouter } from '../../../types';
import { SpacesServiceStart } from '../../../spaces_service/spaces_service';
import { initGetActiveSpaceApi } from './get_active_space';

export interface InternalRouteDeps {
  internalRouter: SpacesRouter;
  getSpacesService: () => SpacesServiceStart;
}

export function initInternalSpacesApi(deps: InternalRouteDeps) {
  initGetActiveSpaceApi(deps);
}
