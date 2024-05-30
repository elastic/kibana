/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, Logger } from '@kbn/core/server';

import { initCopyToSpacesApi } from './copy_to_space';
import { initDeleteSpacesApi } from './delete';
import { initDisableLegacyUrlAliasesApi } from './disable_legacy_url_aliases';
import { initGetSpaceApi } from './get';
import { initGetAllSpacesApi } from './get_all';
import { initGetShareableReferencesApi } from './get_shareable_references';
import { initPostSpacesApi } from './post';
import { initPutSpacesApi } from './put';
import { initUpdateObjectsSpacesApi } from './update_objects_spaces';
import type { SpacesServiceStart } from '../../../spaces_service';
import type { SpacesRouter } from '../../../types';
import type { UsageStatsServiceSetup } from '../../../usage_stats';

export interface ExternalRouteDeps {
  router: SpacesRouter;
  getStartServices: CoreSetup['getStartServices'];
  getSpacesService: () => SpacesServiceStart;
  usageStatsServicePromise: Promise<UsageStatsServiceSetup>;
  log: Logger;
  isServerless: boolean;
}

export function initExternalSpacesApi(deps: ExternalRouteDeps) {
  // These two routes are always registered, internal in serverless by default
  initGetSpaceApi(deps);
  initGetAllSpacesApi(deps);

  // In the serverless environment, Spaces are enabled but are effectively hidden from the user. We
  // do not support more than 1 space: the default space. These HTTP APIs for creating, deleting,
  // updating, and manipulating saved objects across multiple spaces are not needed.
  initPutSpacesApi(deps);
  initDeleteSpacesApi(deps);
  initPostSpacesApi(deps);
  initCopyToSpacesApi(deps);
  initUpdateObjectsSpacesApi(deps);
  initGetShareableReferencesApi(deps);

  if (!deps.isServerless) {
    initDisableLegacyUrlAliasesApi(deps);
  }
}
