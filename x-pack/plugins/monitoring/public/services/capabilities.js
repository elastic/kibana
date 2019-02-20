/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';

const uiModule = uiModules.get('monitoring/capabilities');
uiModule.service('capabilities', ($injector) => {
  return (clusterUuid, ccs) => {
    // append clusterUuid if the parameter is given
    let url = '../api/monitoring/v1/capabilities';
    if (clusterUuid) {
      url += `/${clusterUuid}`;
    }

    const $http = $injector.get('$http');
    return $http.post(url, {
      ccs,
    })
      .then(response => response.data)
      .catch(err => {
        const Private = $injector.get('Private');
        const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
        return ajaxErrorHandlers(err);
      });
  };
});
