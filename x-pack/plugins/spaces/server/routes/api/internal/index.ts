/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { initInternalSpacesApi } from './spaces';
import { LegacyAPI } from '../../../plugin';
import { SpacesServiceSetup } from '../../../spaces_service/spaces_service';

export interface InternalRouteDeps {
  spacesService: SpacesServiceSetup;
  getLegacyAPI(): LegacyAPI;
  internalRouter: IRouter;
}

export function initInternalApis(deps: InternalRouteDeps) {
  initInternalSpacesApi(deps);
}
