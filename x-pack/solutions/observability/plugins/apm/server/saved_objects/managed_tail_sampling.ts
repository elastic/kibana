/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { MANAGED_TAIL_SAMPLING_SAVED_OBJECT_TYPE } from '../../common/apm_saved_object_constants';

/**
 * These schemas only check that the stored keys exist and have the right type.
 * Rules such as "sample rate is between 0 and 100" belong to the route validator:
 * a rule here could make an already stored document fail on read.
 */
const managedTailSamplingAttributes = {
  enabled: schema.boolean(),
  // The ordered policy list, serialized as JSON.
  policiesJson: schema.string(),
  // Hash of `policiesJson`, used as the ETag when the collector polls.
  policiesHash: schema.string(),
  updatedBy: schema.maybe(schema.string()),
};

export const managedTailSamplingCreateSchema = schema.object(managedTailSamplingAttributes);

export const managedTailSamplingForwardCompatibilitySchema = schema.object(
  managedTailSamplingAttributes,
  { unknowns: 'ignore' }
);

/**
 * One document for the whole project, not one per Kibana space, because the
 * collector that polls it has no space to choose. Hence `agnostic`.
 */
export const managedTailSampling: SavedObjectsType = {
  name: MANAGED_TAIL_SAMPLING_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: managedTailSamplingCreateSchema,
        forwardCompatibility: managedTailSamplingForwardCompatibilitySchema,
      },
    },
  },
};
