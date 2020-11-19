/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'src/core/server';
import { APM_TELEMETRY_SAVED_OBJECT_ID } from '../../common/apm_saved_object_constants';

export const apmTelemetry: SavedObjectsType = {
  name: APM_TELEMETRY_SAVED_OBJECT_ID,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
};
