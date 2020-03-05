/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'src/core/server';
import { TypeOf } from '@kbn/config-schema';
import { validateJobSchema } from '../../routes/schemas/job_validation_schema';

type ValidateJobPayload = TypeOf<typeof validateJobSchema>;

export function validateJob(
  callAsCurrentUser: APICaller,
  payload: ValidateJobPayload,
  kbnVersion: string,
  callAsInternalUser: APICaller,
  isSecurityDisabled: boolean
): string[];
