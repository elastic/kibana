/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './saved_gis_map';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader, SavedObjectsClientProvider } from 'ui/saved_objects';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';

const module = uiModules.get('app/maps');

// Register this service with the saved object registry so it can be
// edited by the object editor.
SavedObjectRegistryProvider.register({
  service: 'gisMapSavedObjectLoader',
  title: 'gisMaps'
});

// This is the only thing that gets injected into controllers
module.service('gisMapSavedObjectLoader', function (Private, SavedGisMap, kbnIndex, kbnUrl, $http, chrome) {
  const savedObjectClient = Private(SavedObjectsClientProvider);
  return new SavedObjectLoader(SavedGisMap, kbnUrl, chrome, savedObjectClient);
});
