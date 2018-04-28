/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './import_events_modal.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlImportEventsService', function ($q, $modal) {

  this.openImportEventsWindow = function () {
    return $q((resolve, reject) => {
      const modal = $modal.open({
        template,
        controller: 'MlImportEventsModal',
        backdrop: 'static',
        keyboard: false
      });

      modal.result
        .then(resolve)
        .catch(reject);
    });
  };

});
