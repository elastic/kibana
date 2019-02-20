/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { ajaxErrorHandlersProvider } from 'plugins/monitoring/lib/ajax_error_handler';

const uiModule = uiModules.get('monitoring/monitoringHosts');
uiModule.service('monitoringHosts', ($injector) => {
  return () => {
    const url = '../api/monitoring/v1/capabilities/monitoring_hosts';
    const $http = $injector.get('$http');
    return $http.post(url)
      .then(response => response.data)
      .catch(err => {
        const Private = $injector.get('Private');
        const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
        return ajaxErrorHandlers(err);
      });
  };
});
