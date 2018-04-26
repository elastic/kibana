/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';

export function getPageData($injector) {
  const globalState = $injector.get('globalState');
  const timefilter = $injector.get('timefilter');
  const $http = $injector.get('$http');
  const features = $injector.get('features');

  const url = `../api/monitoring/v1/clusters/${globalState.cluster_uuid}/elasticsearch/indices`;
  const showSystemIndices = features.isEnabled('showSystemIndices', false);
  const timeBounds = timefilter.getBounds();

  /* TODO: get `pageIndex`, `filterText`, `sortKey`, `sortOrder` through `getLocalStorageData`
   * and send params through API */

  return $http.post(url, {
    showSystemIndices,
    ccs: globalState.ccs,
    timeRange: {
      min: timeBounds.min.toISOString(),
      max: timeBounds.max.toISOString()
    }
  })
    .then(response => response.data)
    .then(data => {
      data.rows.forEach(row => {
      // calculate a numerical field to help sorting by status
      // this allows default sort to show red, then yellow, then green
        switch (row.status) {
          case 'Deleted':
            row.statusSort = 0;
            break;
          case 'green':
            row.statusSort = 1;
            break;
          case 'yellow':
            row.statusSort = 2;
            break;
          default:
            row.statusSort = 3;
        }
      });
      return data;
    })
    .catch((err) => {
      const Private = $injector.get('Private');
      const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
      return ajaxErrorHandlers(err);
    });
}
