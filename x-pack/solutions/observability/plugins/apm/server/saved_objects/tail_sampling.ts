/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { TAIL_SAMPLING_SAVED_OBJECT_TYPE } from '../../common/apm_saved_object_constants';

// Long enough for processor names such as 'adaptive_tail_sampling'.
const MAX_PROCESSOR_LENGTH = 64;

/**
 * These schemas only check that the stored keys exist and have the right type.
 * Allowed processors and the contents of the config are checked by the route
 * validator: a rule here could make an already stored document fail on read.
 */
const tailSamplingAttributes = {
  enabled: schema.boolean(),
  /**
   * The tail-sampling processor the project uses, for example 'tail_sampling'.
   * A project uses exactly one processor at a time. Kept as a plain string, so a
   * new processor (such as 'adaptive_tail_sampling') needs no model version.
   */
  processor: schema.string({ maxLength: MAX_PROCESSOR_LENGTH }),
  /**
   * The processor's config as JSON, for example {"policies":[...]} for 'tail_sampling'.
   * Stored in normalized form: object keys sorted, array order kept.
   */
  configJson: schema.string(),
  // Hash of the config, compared with the rollout status hashes.
  configHash: schema.string(),
  updatedBy: schema.maybe(schema.string()),
};

export const tailSamplingCreateSchema = schema.object(tailSamplingAttributes);

export const tailSamplingForwardCompatibilitySchema = schema.object(tailSamplingAttributes, {
  unknowns: 'ignore',
});

/**
 * One document for the whole project, not one per Kibana space: the sampler runs
 * once per project and traces have no space. Hence `agnostic`.
 */
export const tailSampling: SavedObjectsType = {
  name: TAIL_SAMPLING_SAVED_OBJECT_TYPE,
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
        create: tailSamplingCreateSchema,
        forwardCompatibility: tailSamplingForwardCompatibilitySchema,
      },
    },
  },
};
