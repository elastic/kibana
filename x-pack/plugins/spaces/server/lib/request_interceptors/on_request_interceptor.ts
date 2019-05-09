/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { KibanaRequest, OnRequestToolkit, HttpServiceSetup } from 'src/core/server';
import { KibanaConfig } from 'src/legacy/server/kbn_server';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { getSpaceIdFromPath } from '../spaces_url_parser';

export interface OnRequestInterceptorDeps {
  config: KibanaConfig;
  http: HttpServiceSetup;
}
export function initSpacesOnRequestInterceptor({ config, http }: OnRequestInterceptorDeps) {
  const serverBasePath: string = config.get('server.basePath');

  http.registerOnRequest(async function spacesOnRequestHandler(
    request: KibanaRequest,
    toolkit: OnRequestToolkit
  ) {
    const path = request.path;

    // If navigating within the context of a space, then we store the Space's URL Context on the request,
    // and rewrite the request to not include the space identifier in the URL.
    const spaceId = getSpaceIdFromPath(path, serverBasePath);

    if (spaceId !== DEFAULT_SPACE_ID) {
      const reqBasePath = `/s/${spaceId}`;

      http.setBasePathFor(request, reqBasePath);

      const newLocation = path.substr(reqBasePath.length) || '/';

      toolkit.setUrl(newLocation);
    }

    return toolkit.next();
  });
}
