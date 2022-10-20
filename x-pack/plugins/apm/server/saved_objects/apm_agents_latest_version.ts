/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_ID } from '@kbn/apm-plugin/common/apm_saved_object_constants';
import { SavedObjectsType } from '@kbn/core/server';

export const apmAgentsLatestVersion: SavedObjectsType = {
  name: APM_AGENTS_LATEST_VERSION_SAVED_OBJECT_ID,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
};
