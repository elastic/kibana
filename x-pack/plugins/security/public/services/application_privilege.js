/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'angular-resource';
import { uiModules } from 'ui/modules';

const module = uiModules.get('security', ['ngResource']);
module.service('ApplicationPrivileges', ($resource, chrome) => {
  const baseUrl = chrome.addBasePath('/api/security/v1/privileges');
  return $resource(baseUrl, null, {
    query: {
      isArray: false,
    }
  });
});
