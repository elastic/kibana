/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ajaxErrorHandlersProvider } from './ajax_error_handler';
import { Legacy } from '../legacy_shims';

export function getPageData($injector, api) {
  const $http = $injector.get('$http');
  const globalState = $injector.get('globalState');
  const timeBounds = Legacy.shims.timefilter.getBounds();

  return $http
    .post(api, {
      ccs: globalState.ccs,
      timeRange: {
        min: timeBounds.min.toISOString(),
        max: timeBounds.max.toISOString(),
      },
    })
    .then((response) => response.data)
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}
