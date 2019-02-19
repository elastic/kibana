/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
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

function mapSavedObjectLoaderProvider(Private, SavedGisMap, kbnUrl, chrome) {
  const savedObjectClient = Private(SavedObjectsClientProvider);
  return new SavedObjectLoader(SavedGisMap, kbnUrl, chrome, savedObjectClient);
}

export const getMapSavedObjectLoader = async () => {
  const $injector = await chrome.dangerouslyGetActiveInjector();
  return mapSavedObjectLoaderProvider(
    $injector.get('Private'),
    $injector.get('SavedGisMap'),
    $injector.get('kbnUrl'),
    $injector.get('chrome')
  );
};

// This is the only thing that gets injected into controllers
module.service('gisMapSavedObjectLoader', mapSavedObjectLoaderProvider);
