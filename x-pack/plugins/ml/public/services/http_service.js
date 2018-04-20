/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// service for interacting with the server

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml');

import { addSystemApiHeader } from 'ui/system_api';

module.service('prlHttpService', function ($http, $q) {

  // request function returns a promise
  // once resolved, just the data response is returned
  this.request = function (options) {
    if(options && options.url) {
      let url = '';
      url = url + (options.url || '');
      const headers = addSystemApiHeader({});
      const allHeaders = (options.headers === undefined) ?
        headers :
        Object.assign(options.headers, headers);


      const deferred = $q.defer();

      $http({
        url: url,
        method: (options.method || 'GET'),
        headers: (allHeaders),
        params: (options.params || {}),
        data: (options.data || null)
      })
        .then(function successCallback(response) {
          deferred.resolve(response.data);
        }, function errorCallback(response) {
          deferred.reject(response.data);
        });

      return deferred.promise;
    }
  };

});

