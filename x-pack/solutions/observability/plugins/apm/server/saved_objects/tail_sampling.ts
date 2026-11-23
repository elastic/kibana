/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { Type } from '@kbn/config-schema';
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
   * Stored as sent by the user. The control API normalizes policies.
   */
  configJson: schema.string(),
  // Opaque hash returned by the control API's _validate. Compared with the rollout status hashes.
  configHash: schema.string(),
  updatedBy: schema.maybe(schema.string()),
};

/**
 * Whether the control API has accepted the stored config.
 * - 'pending': saved in Kibana, the control API call has not succeeded yet (a retry may be waiting).
 * - 'synced': the control API accepted the config.
 * - 'failed': the control API call failed and needs attention.
 * Rollout status (observed and active hashes) stays with the control API.
 */
export const TAIL_SAMPLING_POLICY_STATES = ['pending', 'synced', 'failed'] as const;
export type TailSamplingPolicyState = (typeof TAIL_SAMPLING_POLICY_STATES)[number];

export const tailSamplingCreateSchema = schema.object({
  ...tailSamplingAttributes,
  // Strict on write: only known states can be stored.
  policyState: schema.oneOf(
    TAIL_SAMPLING_POLICY_STATES.map((state) => schema.literal(state)) as [
      Type<TailSamplingPolicyState>,
      ...Array<Type<TailSamplingPolicyState>>
    ]
  ),
});

export const tailSamplingForwardCompatibilitySchema = schema.object(
  {
    ...tailSamplingAttributes,
    // Lenient on read: a state added by a newer Kibana must not break an older one.
    policyState: schema.string(),
  },
  { unknowns: 'ignore' }
);

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
