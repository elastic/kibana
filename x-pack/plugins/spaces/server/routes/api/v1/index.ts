/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsService, KibanaConfig } from 'src/legacy/server/kbn_server';
import { XPackMainPlugin } from '../../../../../xpack_main/xpack_main';
import { routePreCheckLicense } from '../../../lib/route_pre_check_license';
import { initPrivateSpacesApi } from './spaces';
import { SpacesServiceSetup } from '../../../new_platform/spaces_service/spaces_service';
import { SpacesHttpServiceSetup } from '../../../new_platform/plugin';

type InterfaceExcept<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

interface RouteDeps {
  xpackMain: XPackMainPlugin;
  http: SpacesHttpServiceSetup;
  savedObjects: SavedObjectsService;
  spacesService: SpacesServiceSetup;
  config: KibanaConfig;
}

export interface PrivateRouteDeps extends InterfaceExcept<RouteDeps, 'xpackMain'> {
  routePreCheckLicenseFn: any;
}

export function initPrivateApis({ xpackMain, ...rest }: RouteDeps) {
  const routePreCheckLicenseFn = routePreCheckLicense({ xpackMain });

  const deps: PrivateRouteDeps = {
    ...rest,
    routePreCheckLicenseFn,
  };

  initPrivateSpacesApi(deps);
}
