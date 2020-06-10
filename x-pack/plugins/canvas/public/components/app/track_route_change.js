/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { getWindow } from '../../lib/get_window';
import { CANVAS_APP } from '../../../common/lib/constants';
import { platformService } from '../../services';

export function trackRouteChange() {
  const basePath = platformService.getService().coreStart.http.basePath.get();

  platformService
    .getService()
    .startPlugins.__LEGACY.trackSubUrlForApp(
      CANVAS_APP,
      platformService
        .getService()
        .startPlugins.__LEGACY.absoluteToParsedUrl(get(getWindow(), 'location.href'), basePath)
    );
}
