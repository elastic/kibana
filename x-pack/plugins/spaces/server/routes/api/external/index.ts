/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger, SavedObjectsLegacyService, IRouter } from 'src/core/server';
import { initDeleteSpacesApi } from './delete';
import { initGetSpaceApi } from './get';
import { initGetAllSpacesApi } from './get_all';
import { initPostSpacesApi } from './post';
import { initPutSpacesApi } from './put';
import { SpacesServiceSetup } from '../../../spaces_service/spaces_service';
import { initCopyToSpacesApi } from './copy_to_space';

export interface ExternalRouteDeps {
  externalRouter: IRouter;
  getSavedObjects: () => SavedObjectsLegacyService;
  spacesService: SpacesServiceSetup;
  log: Logger;
}

export function initExternalSpacesApi(deps: ExternalRouteDeps) {
  initDeleteSpacesApi(deps);
  initGetSpaceApi(deps);
  initGetAllSpacesApi(deps);
  initPostSpacesApi(deps);
  initPutSpacesApi(deps);
  initCopyToSpacesApi(deps);
}
