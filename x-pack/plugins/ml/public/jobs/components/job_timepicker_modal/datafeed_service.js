/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import jobTimePickerTemplate from './job_timepicker_modal.html';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

module.service('mlDatafeedService', function ($modal) {

  this.openJobTimepickerWindow = function (job) {
    $modal.open({
      template: jobTimePickerTemplate,
      controller: 'MlJobTimepickerModal',
      backdrop: 'static',
      keyboard: false,
      resolve: {
        params: function () {
          return {
            job
          };
        }
      }
    });
  };

});
