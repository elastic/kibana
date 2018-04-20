/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import template from './new_event_modal.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlNewEventService', function ($q, $modal) {

  this.openNewEventWindow = function () {
    return $q((resolve, reject) => {
      const modal = $modal.open({
        template,
        controller: 'MlNewEventModal',
        backdrop: 'static',
        keyboard: false
      });

      modal.result
        .then(resolve)
        .catch(reject);
    });
  };

});
