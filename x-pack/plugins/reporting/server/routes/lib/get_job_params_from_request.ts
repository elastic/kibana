/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { JobParamPostPayload, JobParams } from '../../../types';

export function getJobParamsFromRequest(request: Request): JobParams {
  const { savedObjectType, savedObjectId } = request.params;
  const { timerange, state } = request.payload as JobParamPostPayload;
  const post = timerange || state ? { timerange, state } : undefined;

  return {
    isImmediate: true,
    savedObjectType,
    savedObjectId,
    post,
  };
}
