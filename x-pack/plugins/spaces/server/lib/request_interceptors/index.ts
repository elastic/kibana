/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';
import { KibanaConfig, Server } from 'src/legacy/server/kbn_server';
import { XPackMainPlugin } from '../../../../xpack_main/xpack_main';
import { initSpacesOnRequestInterceptor } from './on_request_interceptor';
import { initSpacesOnPostAuthRequestInterceptor } from './on_post_auth_interceptor';
import { SpacesServiceSetup } from '../../new_platform/spaces_service/spaces_service';

export interface InterceptorDeps {
  config: KibanaConfig;
  legacyServer: Server;
  xpackMain: XPackMainPlugin;
  spacesService: SpacesServiceSetup;
  log: Logger;
}

export function initSpacesRequestInterceptors(deps: InterceptorDeps) {
  initSpacesOnRequestInterceptor(deps);
  initSpacesOnPostAuthRequestInterceptor(deps);
}
