/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpServiceSetup, Logger } from 'src/core/server';
import { SavedObjectsService } from 'src/legacy/server/kbn_server';
import { XPackMainPlugin } from '../../../../../xpack_main/xpack_main';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { initDeleteSpacesApi } from './delete';
import { initGetSpacesApi } from './get';
import { initPostSpacesApi } from './post';
import { initPutSpacesApi } from './put';
import { SpacesServiceSetup } from '../../../new_platform/spaces_service/spaces_service';

type InterfaceExcept<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

interface RouteDeps {
  xpackMain: XPackMainPlugin;
  http: HttpServiceSetup;
  savedObjects: SavedObjectsService;
  spacesService: SpacesServiceSetup;
  log: Logger;
}

export interface PublicRouteDeps extends InterfaceExcept<RouteDeps, 'xpackMain'> {
  routePreCheckLicenseFn: any;
}

export function initPublicSpacesApi({ xpackMain, ...rest }: RouteDeps) {
  const routePreCheckLicenseFn = routePreCheckLicense({ xpackMain });

  const deps: PublicRouteDeps = {
    ...rest,
    routePreCheckLicenseFn,
  };

  initDeleteSpacesApi(deps);
  initGetSpacesApi(deps);
  initPostSpacesApi(deps);
  initPutSpacesApi(deps);
}
