/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';

import type { SpacesServiceStart } from '../../../spaces_service';
import type { SpacesRouter } from '../../../types';
import type { UsageStatsServiceSetup } from '../../../usage_stats';
import { initCopyToSpacesApi } from './copy_to_space';
import { initDeleteSpacesApi } from './delete';
import { initDisableLegacyUrlAliasesApi } from './disable_legacy_url_aliases';
import { initGetSpaceApi } from './get';
import { initGetAllSpacesApi } from './get_all';
import { initGetShareableReferencesApi } from './get_shareable_references';
import { initPostSpacesApi } from './post';
import { initPutSpacesApi } from './put';
import { initUpdateObjectsSpacesApi } from './update_objects_spaces';

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
  initUpdateObjectsSpacesApi(deps);
  initGetShareableReferencesApi(deps);
  initDisableLegacyUrlAliasesApi(deps);
}
