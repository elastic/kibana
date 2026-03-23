/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventOutcome, StatusCode } from '@kbn/apm-types';

export const isFailureOrError = (status: EventOutcome | StatusCode | undefined) => {
  if (!status) {
    return false;
  }
  return status === 'failure' || status === 'Error';
};
