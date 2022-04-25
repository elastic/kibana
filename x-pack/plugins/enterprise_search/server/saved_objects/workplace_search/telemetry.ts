/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* istanbul ignore file */

import { SavedObjectsType } from '@kbn/core/server';

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
