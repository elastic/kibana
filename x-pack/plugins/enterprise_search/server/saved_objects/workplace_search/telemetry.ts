/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* istanbul ignore file */

import { SavedObjectsType } from 'src/core/server';
import { WS_TELEMETRY_NAME } from '../../collectors/workplace_search/telemetry';

export const workplaceSearchTelemetryType: SavedObjectsType = {
  name: WS_TELEMETRY_NAME,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
};
