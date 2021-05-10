/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

import { NonEmptyArray } from './non_empty_array';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const machine_learning_job_id_normalized = NonEmptyArray(t.string);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type MachineLearningJobIdNormalized = t.TypeOf<typeof machine_learning_job_id_normalized>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const machineLearningJobIdNormalizedOrUndefined = t.union([
  machine_learning_job_id_normalized,
  t.undefined,
]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type MachineLearningJobIdNormalizedOrUndefined = t.TypeOf<
  typeof machineLearningJobIdNormalizedOrUndefined
>;
