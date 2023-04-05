/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { CASES_INDEX, CASE_TELEMETRY_SAVED_OBJECT } from '../../common/constants';

export const casesTelemetrySavedObjectType: SavedObjectsType = {
  name: CASE_TELEMETRY_SAVED_OBJECT,
  indexPattern: CASES_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
};
