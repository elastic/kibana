/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { createSavedGisMapClass } from './saved_gis_map';
import { SavedObjectLoader } from '../../../../../../../src/plugins/saved_objects/public';
import { getSavedObjects, getSavedObjectsClient } from '../../../kibana_services';

export const getMapsSavedObjectLoader = _.once(function () {
  const SavedGisMap = createSavedGisMapClass(getSavedObjects());

  return new SavedObjectLoader(SavedGisMap, getSavedObjectsClient());
});
